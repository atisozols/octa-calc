const Joi = require('joi');

const carDataSchema = Joi.object({
  reg: Joi.string().max(10).required().messages({
    'string.empty': 'Nepieciešams auto reģistrācijas numurs.',
    'string.max': 'Auto reģistrācijas numuram jābūt ne vairāk kā 10 simboliem.',
  }),
  vin: Joi.string().length(9).required().messages({
    'string.empty': 'Nepieciešams reģistrācijas dokumenta numurs (vin).',
    'string.length':
      'Reģistrācijas dokumenta numuram (vin) jābūt tieši 9 simboliem.',
  }),
});

const phoneSchema = Joi.object({
  country_code: Joi.string()
    .pattern(/^\d{1,4}$/)
    .required()
    .messages({
      'string.empty': 'Lūdzu, ievadiet valsts kodu.',
      'string.pattern.base': 'Valsts kodam jābūt no 1 līdz 4 cipariem.',
    }),
  number: Joi.string()
    .pattern(/^\d{4,14}$/)
    .required()
    .messages({
      'string.empty': 'Lūdzu, ievadiet tālruņa numuru.',
      'string.pattern.base': 'Tālruņa numuram jābūt no 4 līdz 14 cipariem.',
    }),
});

const checkoutSchema = Joi.object({
  carData: carDataSchema.required().messages({
    'any.required': 'Nepieciešama auto informācija.',
  }),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'string.empty': 'Lūdzu, ievadiet e-pastu.',
      'string.email': 'Nederīgs e-pasta formāts.',
    }),
  phone: phoneSchema.required().messages({
    'any.required': 'Nepieciešama tālruņa informācija.',
  }),
  selectedOfferId: Joi.string()
    .valid(...process.env.INSURANCE_COMPANIES.split(','))
    .required()
    .messages({
      'any.only': 'Lūdzu, izvēlieties apdrošinātāju no mūsu saraksta.',
      'string.empty': 'Jums jāizvēlas apdrošināšanas pakalpojumu sniedzējs.',
    }),
  octaDuration: Joi.number().valid(1, 3, 6, 9, 12).required().messages({
    'any.only': 'Lūdzu, izvēlieties pareizu apdrošināšanas periodu.',
  }),
});

const validateAutoRequest = (data) =>
  carDataSchema.validate(data, { abortEarly: false });

const validateCheckout = (data) =>
  checkoutSchema.validate(data, { abortEarly: false });

module.exports = { validateAutoRequest, validateCheckout };
