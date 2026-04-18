interface ReferenceRange {
  unit: string
  ranges: Array<{
    gender?: 'male' | 'female'
    ageMin?: number
    ageMax?: number
    pregnant?: boolean
    low: number
    high: number
  }>
  critical_low?: number
  critical_high?: number
}

interface ReferenceRanges {
  [testType: string]: {
    [parameter: string]: ReferenceRange
  }
}

const referenceRanges: ReferenceRanges = {
  'FBC': {
    haemoglobin: {
      unit: 'g/dL',
      ranges: [
        { gender: 'male', ageMin: 18, ageMax: 999, low: 13.5, high: 17.5 },
        { gender: 'female', ageMin: 18, ageMax: 999, low: 12.0, high: 16.0 },
        { gender: 'female', pregnant: true, low: 11.0, high: 14.0 },
        { ageMin: 0, ageMax: 1, low: 14.0, high: 20.0 },
        { ageMin: 1, ageMax: 12, low: 11.5, high: 15.5 }
      ],
      critical_low: 6.0,
      critical_high: 20.0
    },
    rbc_count: {
      unit: 'x10^12/L',
      ranges: [
        { gender: 'male', ageMin: 18, ageMax: 999, low: 4.5, high: 5.9 },
        { gender: 'female', ageMin: 18, ageMax: 999, low: 4.0, high: 5.2 },
        { ageMin: 0, ageMax: 1, low: 3.8, high: 5.8 },
        { ageMin: 1, ageMax: 12, low: 4.0, high: 5.2 }
      ],
      critical_low: 2.5,
      critical_high: 7.0
    },
    wbc_count: {
      unit: 'x10^9/L',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 4.0, high: 11.0 }
      ],
      critical_low: 1.0,
      critical_high: 30.0
    },
    platelet_count: {
      unit: 'x10^9/L',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 150, high: 450 }
      ],
      critical_low: 50,
      critical_high: 600
    },
    haematocrit: {
      unit: '%',
      ranges: [
        { gender: 'male', ageMin: 18, ageMax: 999, low: 40, high: 52 },
        { gender: 'female', ageMin: 18, ageMax: 999, low: 36, high: 48 },
        { ageMin: 0, ageMax: 1, low: 42, high: 60 },
        { ageMin: 1, ageMax: 12, low: 35, high: 47 }
      ],
      critical_low: 20,
      critical_high: 60
    },
    mcv: {
      unit: 'fL',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 80, high: 100 }
      ],
      critical_low: 70,
      critical_high: 110
    },
    mch: {
      unit: 'pg',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 27, high: 33 }
      ],
      critical_low: 23,
      critical_high: 37
    },
    mchc: {
      unit: 'g/dL',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 32, high: 36 }
      ],
      critical_low: 28,
      critical_high: 38
    }
  },
  'LFT': {
    alt: {
      unit: 'U/L',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 7, high: 56 }
      ],
      critical_high: 200
    },
    ast: {
      unit: 'U/L',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 10, high: 40 }
      ],
      critical_high: 150
    },
    alp: {
      unit: 'U/L',
      ranges: [
        { ageMin: 0, ageMax: 18, low: 100, high: 350 },
        { ageMin: 18, ageMax: 50, low: 45, high: 115 },
        { ageMin: 50, ageMax: 999, low: 30, high: 120 }
      ],
      critical_high: 500
    },
    ggt: {
      unit: 'U/L',
      ranges: [
        { gender: 'male', ageMin: 18, ageMax: 999, low: 10, high: 71 },
        { gender: 'female', ageMin: 18, ageMax: 999, low: 6, high: 42 }
      ],
      critical_high: 300
    },
    total_bilirubin: {
      unit: 'μmol/L',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 3, high: 17 }
      ],
      critical_high: 50
    },
    albumin: {
      unit: 'g/L',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 35, high: 50 }
      ],
      critical_low: 20
    },
    total_protein: {
      unit: 'g/L',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 60, high: 83 }
      ],
      critical_low: 40,
      critical_high: 100
    }
  },
  'RFT': {
    urea: {
      unit: 'mmol/L',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 2.5, high: 7.1 }
      ],
      critical_high: 20
    },
    creatinine: {
      unit: 'μmol/L',
      ranges: [
        { gender: 'male', ageMin: 18, ageMax: 50, low: 64, high: 110 },
        { gender: 'female', ageMin: 18, ageMax: 50, low: 44, high: 80 },
        { gender: 'male', ageMin: 50, ageMax: 999, low: 66, high: 120 },
        { gender: 'female', ageMin: 50, ageMax: 999, low: 57, high: 96 }
      ],
      critical_high: 500
    },
    egfr: {
      unit: 'mL/min/1.73m²',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 90, high: 120 }
      ],
      critical_low: 15
    },
    sodium: {
      unit: 'mmol/L',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 135, high: 145 }
      ],
      critical_low: 120,
      critical_high: 160
    },
    potassium: {
      unit: 'mmol/L',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 3.5, high: 5.1 }
      ],
      critical_low: 2.5,
      critical_high: 6.5
    },
    chloride: {
      unit: 'mmol/L',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 98, high: 107 }
      ],
      critical_low: 80,
      critical_high: 120
    },
    bicarbonate: {
      unit: 'mmol/L',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 22, high: 29 }
      ],
      critical_low: 12,
      critical_high: 40
    }
  },
  'Lipid Panel': {
    total_cholesterol: {
      unit: 'mmol/L',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 3.0, high: 5.2 }
      ],
      critical_high: 8.0
    },
    hdl_cholesterol: {
      unit: 'mmol/L',
      ranges: [
        { gender: 'male', ageMin: 18, ageMax: 999, low: 1.0, high: 2.0 },
        { gender: 'female', ageMin: 18, ageMax: 999, low: 1.2, high: 2.4 }
      ],
      critical_low: 0.8
    },
    ldl_cholesterol: {
      unit: 'mmol/L',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 0, high: 3.0 }
      ],
      critical_high: 4.5
    },
    triglycerides: {
      unit: 'mmol/L',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 0.5, high: 1.7 }
      ],
      critical_high: 5.0
    },
    vldl: {
      unit: 'mmol/L',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 0.1, high: 0.8 }
      ],
      critical_high: 2.0
    }
  },
  'Thyroid': {
    tsh: {
      unit: 'mIU/L',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 0.4, high: 4.0 }
      ],
      critical_low: 0.1,
      critical_high: 10.0
    },
    ft3: {
      unit: 'pmol/L',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 3.1, high: 6.8 }
      ],
      critical_low: 2.0,
      critical_high: 10.0
    },
    ft4: {
      unit: 'pmol/L',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 12, high: 22 }
      ],
      critical_low: 8,
      critical_high: 30
    }
  },
  'Fasting Glucose': {
    fasting_glucose: {
      unit: 'mmol/L',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 3.9, high: 6.1 }
      ],
      critical_low: 2.2,
      critical_high: 11.0
    }
  },
  'HbA1c': {
    hba1c: {
      unit: '%',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 4.0, high: 5.7 }
      ],
      critical_high: 8.0
    }
  },
  'PSA': {
    psa: {
      unit: 'ng/mL',
      ranges: [
        { gender: 'male', ageMin: 40, ageMax: 50, low: 0, high: 2.5 },
        { gender: 'male', ageMin: 50, ageMax: 60, low: 0, high: 3.5 },
        { gender: 'male', ageMin: 60, ageMax: 70, low: 0, high: 4.5 },
        { gender: 'male', ageMin: 70, ageMax: 999, low: 0, high: 6.5 }
      ],
      critical_high: 10.0
    }
  },
  'Urinalysis': {
    urine_ph: {
      unit: '',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 4.5, high: 8.0 }
      ],
      critical_low: 4.0,
      critical_high: 9.0
    },
    urine_specific_gravity: {
      unit: '',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 1.005, high: 1.030 }
      ],
      critical_low: 1.001,
      critical_high: 1.040
    },
    urine_protein: {
      unit: 'g/L',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 0, high: 0.15 }
      ],
      critical_high: 1.0
    },
    urine_glucose: {
      unit: 'mmol/L',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 0, high: 0 }
      ],
      critical_high: 5.0
    },
    urine_ketones: {
      unit: '',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 0, high: 0 }
      ],
      critical_high: 2
    }
  },
  'CRP': {
    crp: {
      unit: 'mg/L',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 0, high: 5 }
      ],
      critical_high: 50
    }
  },
  'ESR': {
    esr: {
      unit: 'mm/hr',
      ranges: [
        { gender: 'male', ageMin: 0, ageMax: 50, low: 0, high: 15 },
        { gender: 'female', ageMin: 0, ageMax: 50, low: 0, high: 20 },
        { gender: 'male', ageMin: 50, ageMax: 999, low: 0, high: 20 },
        { gender: 'female', ageMin: 50, ageMax: 999, low: 0, high: 30 }
      ],
      critical_high: 60
    }
  },
  'Uric Acid': {
    uric_acid: {
      unit: 'μmol/L',
      ranges: [
        { gender: 'male', ageMin: 18, ageMax: 999, low: 200, high: 420 },
        { gender: 'female', ageMin: 18, ageMax: 999, low: 140, high: 340 }
      ],
      critical_high: 600
    }
  },
  'Iron Studies': {
    serum_iron: {
      unit: 'μmol/L',
      ranges: [
        { gender: 'male', ageMin: 18, ageMax: 999, low: 10, high: 30 },
        { gender: 'female', ageMin: 18, ageMax: 999, low: 7, high: 27 }
      ],
      critical_low: 3,
      critical_high: 40
    },
    tibc: {
      unit: 'μmol/L',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 45, high: 75 }
      ],
      critical_low: 30,
      critical_high: 90
    },
    transferrin_saturation: {
      unit: '%',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 20, high: 45 }
      ],
      critical_low: 10,
      critical_high: 60
    },
    ferritin: {
      unit: 'μg/L',
      ranges: [
        { gender: 'male', ageMin: 18, ageMax: 999, low: 30, high: 300 },
        { gender: 'female', ageMin: 18, ageMax: 999, low: 15, high: 150 }
      ],
      critical_low: 10,
      critical_high: 500
    }
  },
  'Vitamin B12': {
    vitamin_b12: {
      unit: 'pmol/L',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 150, high: 700 }
      ],
      critical_low: 100
    }
  },
  'Vitamin D': {
    vitamin_d: {
      unit: 'nmol/L',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 50, high: 150 }
      ],
      critical_low: 25
    }
  },
  'Folate': {
    folate: {
      unit: 'nmol/L',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 7, high: 39 }
      ],
      critical_low: 5
    }
  },
  'Calcium': {
    total_calcium: {
      unit: 'mmol/L',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 2.2, high: 2.6 }
      ],
      critical_low: 1.8,
      critical_high: 3.0
    },
    ionized_calcium: {
      unit: 'mmol/L',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 1.1, high: 1.3 }
      ],
      critical_low: 0.9,
      critical_high: 1.6
    },
    phosphate: {
      unit: 'mmol/L',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 0.8, high: 1.5 }
      ],
      critical_low: 0.5,
      critical_high: 2.0
    },
    magnesium: {
      unit: 'mmol/L',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 0.7, high: 1.0 }
      ],
      critical_low: 0.5,
      critical_high: 1.5
    }
  },
  'Coagulation': {
    pt: {
      unit: 'seconds',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 10, high: 14 }
      ],
      critical_high: 20
    },
    inr: {
      unit: '',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 0.9, high: 1.1 }
      ],
      critical_high: 2.0
    },
    aptt: {
      unit: 'seconds',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 25, high: 38 }
      ],
      critical_high: 60
    }
  },
  'Cardiac Enzymes': {
    troponin_i: {
      unit: 'ng/L',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 0, high: 14 }
      ],
      critical_high: 50
    },
    troponin_t: {
      unit: 'ng/L',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 0, high: 14 }
      ],
      critical_high: 50
    },
    ck_mb: {
      unit: 'U/L',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 0, high: 25 }
      ],
      critical_high: 100
    },
    ck_total: {
      unit: 'U/L',
      ranges: [
        { gender: 'male', ageMin: 18, ageMax: 999, low: 50, high: 200 },
        { gender: 'female', ageMin: 18, ageMax: 999, low: 35, high: 145 }
      ],
      critical_high: 1000
    }
  },
  'Amylase': {
    amylase: {
      unit: 'U/L',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 25, high: 125 }
      ],
      critical_high: 300
    }
  },
  'Lipase': {
    lipase: {
      unit: 'U/L',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 10, high: 140 }
      ],
      critical_high: 400
    }
  },
  'H. pylori': {
    h_pylori_igg: {
      unit: 'U/mL',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 0, high: 10 }
      ],
      critical_high: 20
    }
  },
  'Hepatitis B': {
    hbsag: {
      unit: '',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 0, high: 0 }
      ],
      critical_high: 1
    },
    anti_hbs: {
      unit: 'mIU/mL',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 10, high: 999 }
      ],
      critical_low: 10
    },
    anti_hbc: {
      unit: 'mIU/mL',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 0, high: 0 }
      ],
      critical_high: 1
    }
  },
  'Hepatitis C': {
    hcv_antibody: {
      unit: '',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 0, high: 0 }
      ],
      critical_high: 1
    },
    hcv_rna: {
      unit: 'IU/mL',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 0, high: 15 }
      ],
      critical_high: 1000000
    }
  },
  'HIV': {
    hiv_1_2: {
      unit: '',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 0, high: 0 }
      ],
      critical_high: 1
    }
  },
  'Malaria': {
    malaria_parasite: {
      unit: '',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 0, high: 0 }
      ],
      critical_high: 1
    }
  },
  'Typhoid': {
    widal_test_o: {
      unit: '',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 0, high: 80 }
      ],
      critical_high: 160
    },
    widal_test_h: {
      unit: '',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 0, high: 80 }
      ],
      critical_high: 160
    }
  },
  'Widal': {
    widal_to: {
      unit: '',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 0, high: 80 }
      ],
      critical_high: 160
    },
    widal_th: {
      unit: '',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 0, high: 80 }
      ],
      critical_high: 160
    },
    widal_ao: {
      unit: '',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 0, high: 80 }
      ],
      critical_high: 160
    },
    widal_ah: {
      unit: '',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 0, high: 80 }
      ],
      critical_high: 160
    }
  },
  'Brucella': {
    brucella_antibody: {
      unit: '',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 0, high: 80 }
      ],
      critical_high: 160
    }
  },
  'ASO': {
    aso_titer: {
      unit: 'IU/mL',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 0, high: 200 }
      ],
      critical_high: 400
    }
  },
  'RF': {
    rheumatoid_factor: {
      unit: 'IU/mL',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 0, high: 14 }
      ],
      critical_high: 20
    }
  },
  'ANA': {
    antinuclear_antibody: {
      unit: '',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 0, high: 0 }
      ],
      critical_high: 1
    }
  },
  'VDRL': {
    vdrl: {
      unit: '',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 0, high: 0 }
      ],
      critical_high: 1
    }
  },
  'RPR': {
    rpr: {
      unit: '',
      ranges: [
        { ageMin: 0, ageMax: 999, low: 0, high: 0 }
      ],
      critical_high: 1
    }
  }
}

export interface ReferenceRangeResult {
  low: number
  high: number
  critical_low?: number
  critical_high?: number
  unit: string
}

export function getReferenceRange(
  testType: string,
  parameter: string,
  patientAge: number,
  patientGender: 'male' | 'female',
  isPregnant = false
): ReferenceRangeResult | null {
  const testRanges = referenceRanges[testType]
  if (!testRanges) return null

  const paramRanges = testRanges[parameter]
  if (!paramRanges) return null

  // Find matching range based on demographics
  const matchingRange = paramRanges.ranges.find((range) => {
    if (range.gender && range.gender !== patientGender) return false
    if (range.pregnant && !isPregnant) return false
    if (range.ageMin !== undefined && patientAge < range.ageMin) return false
    if (range.ageMax !== undefined && patientAge > range.ageMax) return false
    return true
  })

  if (!matchingRange) return null

  return {
    low: matchingRange.low,
    high: matchingRange.high,
    critical_low: paramRanges.critical_low,
    critical_high: paramRanges.critical_high,
    unit: paramRanges.unit
  }
}

export function getParameterStatus(
  value: number,
  range: ReferenceRangeResult
): 'normal' | 'low' | 'critical_low' | 'high' | 'critical_high' {
  if (range.critical_low !== undefined && value < range.critical_low) return 'critical_low'
  if (range.critical_high !== undefined && value > range.critical_high) return 'critical_high'
  if (value < range.low) return 'low'
  if (value > range.high) return 'high'
  return 'normal'
}

export default referenceRanges
