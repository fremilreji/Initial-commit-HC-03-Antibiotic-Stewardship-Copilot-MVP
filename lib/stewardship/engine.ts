import { ANTIBIOGRAM, DRUGS, GUIDELINES, SUSCEPTIBILITY_TARGET } from './data'
import type {
  Drug,
  Finding,
  Guideline,
  OptionCoverage,
  Prescription,
  RegimenOption,
  Review,
  Severity,
  Suggestion,
} from './types'

const SEVERITY_RANK: Record<Severity, number> = { critical: 3, major: 2, minor: 1 }

export function coverageFor(drugKey: string, guideline: Guideline, organism: string | null): number | null {
  if (organism) return ANTIBIOGRAM[organism]?.[drugKey] ?? null
  let weighted = 0
  let totalWeight = 0
  for (const { organism: o, weight } of guideline.likelyOrganisms) {
    const s = ANTIBIOGRAM[o]?.[drugKey]
    if (s == null) continue
    weighted += s * weight
    totalWeight += weight
  }
  return totalWeight ? Math.round(weighted / totalWeight) : null
}

function allergyConflict(drug: Drug, allergies: string[] | undefined | null): string | null {
  const a = (allergies ?? []).map((x) => x.toLowerCase())
  if (drug.family === 'penicillin' && a.includes('penicillin')) return 'penicillin'
  if (drug.family === 'cephalosporin' && a.includes('cephalosporin')) return 'cephalosporin'
  if (drug.family === 'carbapenem' && a.includes('carbapenem')) return 'carbapenem'
  return null
}

function renalRuleApplies(drug: Drug, crCl: number | null) {
  return drug.renal && crCl != null && crCl < drug.renal.crClBelow ? drug.renal : null
}

export function formatDose(mg: number) {
  return mg >= 1000 ? `${+(mg / 1000).toFixed(2)} g` : `${mg} mg`
}

export function formatFrequency(f: number) {
  return ({ 1: 'OD', 2: 'BD (q12h)', 3: 'TDS (q8h)', 4: 'QID (q6h)' } as Record<number, string>)[f] ?? `${f}×/day`
}

export function formatRegimen(r: { drug: string | null; dose: number; frequency: number; route: string; durationDays: number }) {
  if (!r.drug) return 'No antibiotic'
  const name = DRUGS[r.drug]?.name ?? r.drug
  const days = r.durationDays === 1 ? 'single day' : `${r.durationDays} days`
  return `${name} ${formatDose(r.dose)} ${r.route} ${formatFrequency(r.frequency)} × ${days}`
}

function optionDoseMg(option: RegimenOption, drug: Drug, weightKg: number) {
  return drug.doseBasis === 'mgPerKg' ? Math.round((option.dose * weightKg) / 50) * 50 : option.dose
}

export function reviewPrescription(rx: Prescription): Review {
  // If flagged as non-antibiotic: completely bypass all stewardship checks
  const isNonAntibiotic =
    rx.isAntibiotic === false ||
    rx.drug === 'non_antibiotic' ||
    rx.flags?.some((f) => f.includes('NON-ANTIBIOTIC'))

  if (isNonAntibiotic) {
    return {
      rx,
      guideline: null as any,
      findings: [],
      coverage: null,
      optionCoverage: [],
      suggestion: null,
      topSeverity: 'minor',
    }
  }

  const guideline = GUIDELINES[rx.indication]
  const drug = DRUGS[rx.drug]
  const findings: Finding[] = []
  const add = (f: Omit<Finding, 'id'>) => findings.push({ ...f, id: `${f.category}-${findings.length}` })

  if (rx.flags && rx.flags.length > 0) {
    for (const flag of rx.flags) {
      if (flag === 'DURATION_EXCEEDS_LOCAL_DEFAULT') {
        add({
          category: 'duration',
          severity: 'major',
          title: 'Duration Exceeds Local Default',
          detail: 'Duration exceeds hospital antibiogram default limit.',
        })
      } else if (flag === 'CULTURE_REQUIRED_BEFORE_OR_AT_START') {
        add({
          category: 'culture',
          severity: 'major',
          title: 'Culture Required Before Or At Start',
          detail: 'Microbiology culture must be sent before or at initiation of antibiotic therapy.',
        })
      } else if (flag === 'RESERVE_AGENT_REQUIRES_JUSTIFICATION') {
        add({
          category: 'drug',
          severity: 'critical',
          title: 'Reserve Agent — Requires Justification',
          detail: 'WHO Reserve class antibiotic prescribed without confirmed culture justification.',
        })
      } else if (flag.includes('ROUTE_ERROR')) {
        add({
          category: 'drug',
          severity: 'major',
          title: 'Route Error: IV In Outpatient',
          detail: flag,
        })
      } else if (flag === 'RENAL_TOXICITY_ALERT') {
        add({
          category: 'dose',
          severity: 'critical',
          title: 'Renal Toxicity Alert',
          detail: 'Patient has CKD; nephrotoxic risk requires dose reduction or alternative.',
        })
      }
    }
  }

  if (!guideline || !drug) {
    add({
      category: 'drug',
      severity: 'major',
      title: 'Unable to review automatically',
      detail: !guideline ? `Indication "${rx.indication}" is not in the hospital guideline.` : `Drug "${rx.drug}" is not in the formulary.`,
    })
    return { rx, guideline, findings, coverage: null, optionCoverage: [], suggestion: null, topSeverity: 'major' }
  }

  if (guideline.noAntibiotic) {
    add({
      category: 'drug',
      severity: 'critical',
      title: 'Antibiotic not indicated',
      detail: `${guideline.name}: ${guideline.notes}`,
    })
    return {
      rx,
      guideline,
      findings,
      coverage: null,
      optionCoverage: [],
      topSeverity: 'critical',
      suggestion: {
        kind: 'stop',
        drug: null,
        dose: 0,
        frequency: 0,
        route: rx.route,
        durationDays: 0,
        coverage: null,
        requiresApproval: false,
        rationale: ['Hospital guideline does not recommend antibiotics for this indication.', guideline.notes],
      },
    }
  }

  const optionCoverage: OptionCoverage[] = guideline.options.map((o) => {
    const d = DRUGS[o.drug]
    const allergy = allergyConflict(d, rx.allergies)
    const renal = renalRuleApplies(d, rx.crCl)
    return {
      drug: o.drug,
      coverage: guideline.skipCoverage ? null : coverageFor(o.drug, guideline, rx.organism),
      firstLine: !!o.firstLine,
      excluded: allergy
        ? `${allergy} allergy`
        : renal?.contraindicated
          ? `CrCl ${rx.crCl}`
          : o.addOn
            ? 'add-on only'
            : null,
    }
  })
  const coverage = guideline.skipCoverage ? null : coverageFor(rx.drug, guideline, rx.organism)
  const bestCoverage = Math.max(...optionCoverage.filter((o) => !o.excluded).map((o) => o.coverage ?? 0), 0)
  const prescribedOption = guideline.options.find((o) => o.drug === rx.drug)

  const allergy = allergyConflict(drug, rx.allergies)
  if (allergy) {
    add({
      category: 'drug',
      severity: 'critical',
      title: `Documented ${allergy} allergy`,
      detail: `${drug.name} is a ${drug.drugClass.toLowerCase()} and is contraindicated for this patient.`,
    })
  }

  const renal = renalRuleApplies(drug, rx.crCl)
  if (renal?.contraindicated) {
    add({ category: 'drug', severity: 'critical', title: `Contraindicated at CrCl ${rx.crCl} mL/min`, detail: renal.note })
  }

  if (!prescribedOption) {
    const firstLine = guideline.options.find((o) => o.firstLine)
    const broader = firstLine && DRUGS[firstLine.drug].aware === 'Access' && drug.aware !== 'Access'
    add({
      category: 'drug',
      severity: 'major',
      title: 'Not in hospital guideline for this indication',
      detail: `${drug.name} is not listed for ${guideline.name.toLowerCase()}.${
        broader ? ` It is a WHO ${drug.aware} antibiotic where an Access option (${DRUGS[firstLine.drug].name}) is first-line.` : ''
      }`,
    })
  } else if (prescribedOption.addOn) {
    add({
      category: 'drug',
      severity: 'major',
      title: 'Monotherapy not recommended',
      detail: `${drug.name} is only an add-on for ${guideline.name.toLowerCase()}. ${prescribedOption.note ?? ''}`.trim(),
    })
  }

  if (drug.aware === 'Reserve') {
    add({
      category: 'drug',
      severity: rx.cultureSent && rx.organism ? 'major' : 'critical',
      title: 'Reserve antibiotic — ID approval required',
      detail:
        rx.cultureSent && rx.organism
          ? `Started for ${rx.organism}. Confirm susceptibility report and Infectious Diseases sign-off.`
          : 'Started empirically without a culture-confirmed resistant organism.',
    })
  }

  if (coverage != null && coverage < SUSCEPTIBILITY_TARGET) {
    const target = rx.organism ? `${rx.organism} isolates` : 'likely pathogens (weighted)'
    if (bestCoverage - coverage >= 10) {
      add({
        category: 'drug',
        severity: coverage < 50 ? 'critical' : 'major',
        title: `Poor local susceptibility (${coverage}%)`,
        detail: `Only ${coverage}% of ${target} are susceptible locally; a guideline option covers ${bestCoverage}%.`,
      })
    } else {
      add({
        category: 'drug',
        severity: 'minor',
        title: `Limited local coverage (${coverage}%)`,
        detail: 'This is the best available empiric option, but de-escalate as soon as the susceptibility report is back.',
      })
    }
  }

  if (rx.dose > 0) {
    const dailyMg = rx.dose * rx.frequency
    const dailyBasis = drug.doseBasis === 'mgPerKg' ? dailyMg / rx.weightKg : dailyMg
    const unit = drug.doseBasis === 'mgPerKg' ? ' mg/kg/day' : ''
    const fmt = (v: number) => (drug.doseBasis === 'mgPerKg' ? `${v.toFixed(1)}${unit}` : `${formatDose(v)}/day`)
    const expectedDaily = prescribedOption && !prescribedOption.addOn ? prescribedOption.dose * prescribedOption.frequency : null
    const minDaily = expectedDaily ? expectedDaily * 0.75 : drug.minDaily

    if (dailyBasis < minDaily) {
      add({
        category: 'dose',
        severity: 'major',
        title: 'Under-dosed',
        detail: `${fmt(dailyBasis)} prescribed; guideline dose is ${fmt(expectedDaily ?? drug.minDaily)}. Sub-therapeutic exposure selects for resistance.`,
      })
    } else if (dailyBasis > drug.maxDaily) {
      add({
        category: 'dose',
        severity: 'major',
        title: 'Exceeds maximum daily dose',
        detail: `${fmt(dailyBasis)} prescribed; maximum is ${fmt(drug.maxDaily)}.`,
      })
    }

    if (renal && !renal.contraindicated && renal.adjusted) {
      const adjustedDaily = renal.adjusted.dose * renal.adjusted.frequency
      if (dailyMg > adjustedDaily) {
        add({
          category: 'dose',
          severity: 'major',
          title: `Not adjusted for renal function (CrCl ${rx.crCl})`,
          detail: `${renal.note} Prescribed ${formatDose(dailyMg)}/day.`,
        })
      }
    }
  }

  if (rx.durationDays > 0) {
    const allowedMin = Math.min(guideline.duration.min, prescribedOption?.durationDays ?? Infinity)
    const allowedMax = Math.max(guideline.duration.max, prescribedOption?.durationDays ?? 0)
    if (rx.durationDays > allowedMax) {
      add({
        category: 'duration',
        severity: 'major',
        title: 'Duration longer than recommended',
        detail: `${rx.durationDays} days prescribed; guideline is ${
          allowedMin === allowedMax ? `${allowedMax} day${allowedMax > 1 ? 's' : ''}` : `${allowedMin}–${allowedMax} days`
        }. ${guideline.key === 'surgical_prophylaxis' ? guideline.notes : 'Set a stop date or review date.'}`,
      })
    } else if (rx.durationDays < allowedMin) {
      add({
        category: 'duration',
        severity: 'minor',
        title: 'Duration shorter than recommended',
        detail: `${rx.durationDays} days prescribed; guideline minimum is ${allowedMin} days.`,
      })
    }
  }

  if (guideline.culture.required && !rx.cultureSent) {
    add({
      category: 'culture',
      severity: 'major',
      title: 'No culture sent',
      detail: `Send ${guideline.culture.specimen} before the first dose so therapy can be de-escalated.`,
    })
  } else if (drug.aware === 'Reserve' && !rx.cultureSent) {
    add({ category: 'culture', severity: 'critical', title: 'No culture sent', detail: 'Reserve antibiotics require a culture before initiation.' })
  }

  let suggestion = buildSuggestion(rx, guideline, drug, findings, optionCoverage)
  if (rx.stepDownAlternative) {
    if (suggestion) {
      suggestion.rationale.push(`Hospital guideline step-down alternative: ${rx.stepDownAlternative}`)
    } else if (findings.length > 0) {
      suggestion = {
        kind: 'switch',
        drug: null,
        dose: rx.dose,
        frequency: rx.frequency,
        route: rx.route,
        durationDays: rx.durationDays,
        coverage: null,
        requiresApproval: false,
        rationale: [`Recommended step-down alternative: ${rx.stepDownAlternative}`],
      }
    }
  }
  const topSeverity = findings.reduce<Severity | null>(
    (top, f) => (!top || SEVERITY_RANK[f.severity] > SEVERITY_RANK[top] ? f.severity : top),
    null,
  )
  return { rx, guideline, findings, coverage, optionCoverage, suggestion, topSeverity }
}

function buildSuggestion(
  rx: Prescription,
  guideline: Guideline,
  drug: Drug,
  findings: Finding[],
  optionCoverage: OptionCoverage[],
): Suggestion | null {
  if (findings.length === 0) return null
  const needsSwitch = findings.some((f) => f.category === 'drug' && f.severity !== 'minor')
  const cultureNote =
    guideline.culture.required && !rx.cultureSent ? [`Send ${guideline.culture.specimen} before the first dose.`] : []

  let option: RegimenOption | undefined
  if (needsSwitch) {
    const ranked = guideline.options
      .map((o, i) => ({ o, cov: optionCoverage[i] }))
      .filter(({ cov }) => !cov.excluded)
      .sort((a, b) => {
        const meetsA = guideline.skipCoverage || (a.cov.coverage ?? 0) >= SUSCEPTIBILITY_TARGET ? 1 : 0
        const meetsB = guideline.skipCoverage || (b.cov.coverage ?? 0) >= SUSCEPTIBILITY_TARGET ? 1 : 0
        if (meetsA !== meetsB) return meetsB - meetsA
        if (!meetsA && (a.cov.coverage ?? 0) !== (b.cov.coverage ?? 0)) return (b.cov.coverage ?? 0) - (a.cov.coverage ?? 0)
        const approvalA = a.o.requiresApproval ? 1 : 0
        const approvalB = b.o.requiresApproval ? 1 : 0
        if (approvalA !== approvalB && !rx.organism) return approvalA - approvalB
        if (a.o.firstLine !== b.o.firstLine) return a.o.firstLine ? -1 : 1
        return (b.cov.coverage ?? 0) - (a.cov.coverage ?? 0)
      })
    option = ranked[0]?.o
    if (!option) {
      return {
        kind: 'switch',
        drug: null,
        dose: 0,
        frequency: 0,
        route: rx.route,
        durationDays: 0,
        coverage: null,
        requiresApproval: true,
        rationale: ['No guideline option is safe for this patient. Refer to the Infectious Diseases team.', ...cultureNote],
      }
    }
  } else {
    option = guideline.options.find((o) => o.drug === rx.drug)
  }

  const target = option ? DRUGS[option.drug] : drug
  const rationale: string[] = []
  let dose = rx.dose
  let frequency = rx.frequency
  let route = rx.route
  let durationDays = Math.min(Math.max(rx.durationDays, guideline.duration.min), guideline.duration.max)

  if (option && (needsSwitch || findings.some((f) => f.category === 'dose'))) {
    dose = optionDoseMg(option, target, rx.weightKg)
    frequency = option.frequency
    route = option.route
  }
  if (option && (needsSwitch || findings.some((f) => f.category === 'duration'))) {
    durationDays = option.durationDays
  }

  const renal = renalRuleApplies(target, rx.crCl)
  if (renal?.adjusted && dose * frequency > renal.adjusted.dose * renal.adjusted.frequency) {
    dose = target.doseBasis === 'mgPerKg' ? Math.round((renal.adjusted.dose * rx.weightKg) / 50) * 50 : renal.adjusted.dose
    frequency = renal.adjusted.frequency
    rationale.push(`Renally adjusted: ${renal.note}`)
  }

  const cov = guideline.skipCoverage ? null : coverageFor(target.key, guideline, rx.organism)
  if (needsSwitch && option) {
    rationale.unshift(
      option.firstLine
        ? `First-line in hospital guideline for ${guideline.name.toLowerCase()}.`
        : `Guideline alternative${option.note ? ` — ${option.note.toLowerCase()}` : ''}.`,
    )
  } else {
    rationale.unshift(`Keep ${target.name}; correct ${findings.some((f) => f.category === 'dose') ? 'dose' : 'regimen'} to guideline.`)
  }
  if (cov != null) {
    rationale.push(
      `Local susceptibility ${cov}% ${rx.organism ? `for ${rx.organism}` : 'for likely pathogens (weighted antibiogram)'}.`,
    )
  }
  rationale.push(`WHO AWaRe: ${target.aware} group.`)
  if ((rx.allergies ?? []).includes('penicillin') && target.family === 'cephalosporin') {
    rationale.push('Penicillin allergy: cefazolin/cephalosporin cross-reactivity is low — confirm the reaction was not anaphylaxis.')
  }
  if (option?.requiresApproval) rationale.push('Requires Infectious Diseases approval before dispensing.')
  rationale.push(...cultureNote)

  return {
    kind: needsSwitch ? 'switch' : 'adjust',
    drug: target.key,
    dose,
    frequency,
    route,
    durationDays,
    coverage: cov,
    requiresApproval: !!option?.requiresApproval,
    rationale,
  }
}
