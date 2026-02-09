import { z } from 'zod';
import { differenceInYears } from 'date-fns';

/**
 * Employee Validation Schemas using Zod
 *
 * These schemas provide client-side validation for employee data
 * to ensure data integrity before sending to the backend.
 */

// Helper validators
const indianPhone = z.string().regex(
  /^[6-9]\d{9}$/,
  'Invalid Indian phone number. Must be 10 digits starting with 6-9'
);

const aadhaarNumber = z.string().regex(
  /^\d{12}$/,
  'Aadhaar must be exactly 12 digits'
);

const panNumber = z.string().regex(
  /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  'Invalid PAN format. Must be like ABCDE1234F'
);

const ifscCode = z.string().regex(
  /^[A-Z]{4}0[A-Z0-9]{6}$/,
  'Invalid IFSC code format'
);

const employeeId = z.string().regex(
  /^[A-Z0-9-]+$/,
  'Employee ID can only contain uppercase letters, numbers, and hyphens'
);

// Date validators with age restrictions
const dateOfBirth = z.coerce.date()
  .refine(
    (date) => {
      const age = differenceInYears(new Date(), date);
      return age >= 18 && age <= 100;
    },
    'Employee must be between 18 and 100 years old'
  )
  .refine(
    (date) => date <= new Date(),
    'Date of birth cannot be in the future'
  );

const joiningDate = z.coerce.date()
  .refine(
    (date) => {
      const diff = differenceInYears(new Date(), date);
      return diff >= -1; // Allow future dates up to 1 year
    },
    'Joining date cannot be more than 1 year in the future'
  );

// Base Employee Schema
export const employeeSchema = z.object({
  // Required fields
  firstName: z.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must not exceed 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes'),

  lastName: z.string()
    .min(1, 'Last name must be at least 1 character')
    .max(50, 'Last name must not exceed 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes'),

  email: z.string()
    .email('Invalid email address')
    .toLowerCase()
    .max(100, 'Email must not exceed 100 characters'),

  phone: indianPhone,

  employeeId: employeeId,

  // Optional but validated fields
  dateOfBirth: dateOfBirth.optional(),

  joiningDate: joiningDate.optional(),

  gender: z.enum(['male', 'female', 'other']).optional(),

  maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed']).optional(),

  department: z.string().max(100).optional(),

  position: z.string().max(100).optional(),

  companyName: z.string().max(100).optional(),

  employmentType: z.enum(['fulltime', 'intern', 'remote', 'contract', 'parttime']).optional(),

  officeAddress: z.enum(['SanikColony', 'Indore', 'N.F.C.', 'Offsite']).optional(),

  reportingSupervisor: z.string().max(100).optional(),

  // Contact Information
  address: z.string().max(500).optional(),

  emergencyContactName: z.string().max(100).optional(),

  emergencyContactNumber: indianPhone.optional(),

  // Parent Information
  fatherName: z.string().max(100).optional(),

  fatherPhone: indianPhone.optional(),

  motherName: z.string().max(100).optional(),

  motherPhone: indianPhone.optional(),

  // Government IDs
  aadhaarNumber: aadhaarNumber.optional(),

  panNumber: panNumber.optional(),

  // Banking Information
  bankName: z.string().max(100).optional(),

  bankAccountNumber: z.string()
    .regex(/^\d{9,18}$/, 'Bank account number must be 9-18 digits')
    .optional(),

  bankIFSCCode: ifscCode.optional(),

  paymentMode: z.enum(['Bank Transfer', 'Cheque', 'Cash']).optional(),

  // Status
  isActive: z.boolean().optional(),
});

// Schema for creating a new employee (stricter requirements)
export const createEmployeeSchema = employeeSchema.extend({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email(),
  phone: indianPhone,
  employeeId: employeeId,
  department: z.string().min(1, 'Department is required'),
  position: z.string().min(1, 'Position is required'),
  joiningDate: joiningDate,
});

// Schema for updating employee (all fields optional except ID)
export const updateEmployeeSchema = z.object({
  _id: z.string().min(1, 'Employee ID is required'),
}).merge(employeeSchema.partial());

// Schema for employee search/filter
export const employeeSearchSchema = z.object({
  search: z.string().optional(),
  department: z.string().optional(),
  employmentType: z.enum(['fulltime', 'intern', 'remote', 'contract', 'parttime']).optional(),
  status: z.enum(['active', 'inactive', 'all']).optional(),
  sortBy: z.enum(['name', 'joiningDate', 'department']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// Schema for bulk employee operations
export const bulkEmployeeActionSchema = z.object({
  employeeIds: z.array(z.string()).min(1, 'At least one employee must be selected'),
  action: z.enum(['activate', 'deactivate', 'delete', 'export']),
  confirm: z.boolean().refine(val => val === true, 'Action must be confirmed'),
});

// Validation helper functions
export const validateEmployee = (data) => {
  try {
    return {
      success: true,
      data: employeeSchema.parse(data),
      errors: null
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.errors.reduce((acc, err) => {
          acc[err.path.join('.')] = err.message;
          return acc;
        }, {})
      };
    }
    return {
      success: false,
      data: null,
      errors: { _error: error.message }
    };
  }
};

export const validateCreateEmployee = (data) => {
  try {
    return {
      success: true,
      data: createEmployeeSchema.parse(data),
      errors: null
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.errors.reduce((acc, err) => {
          acc[err.path.join('.')] = err.message;
          return acc;
        }, {})
      };
    }
    return {
      success: false,
      data: null,
      errors: { _error: error.message }
    };
  }
};

export const validateUpdateEmployee = (data) => {
  try {
    return {
      success: true,
      data: updateEmployeeSchema.parse(data),
      errors: null
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.errors.reduce((acc, err) => {
          acc[err.path.join('.')] = err.message;
          return acc;
        }, {})
      };
    }
    return {
      success: false,
      data: null,
      errors: { _error: error.message }
    };
  }
};

// Field-level validators for real-time validation
export const validateField = (fieldName, value) => {
  try {
    const fieldSchema = employeeSchema.shape[fieldName];
    if (!fieldSchema) {
      return { valid: true, error: null };
    }

    fieldSchema.parse(value);
    return { valid: true, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0]?.message || 'Invalid value' };
    }
    return { valid: false, error: 'Validation error' };
  }
};

export default {
  employeeSchema,
  createEmployeeSchema,
  updateEmployeeSchema,
  employeeSearchSchema,
  bulkEmployeeActionSchema,
  validateEmployee,
  validateCreateEmployee,
  validateUpdateEmployee,
  validateField
};
