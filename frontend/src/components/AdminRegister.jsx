import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { NavLink } from 'react-router';
import axiosClient, { getErrorMessage } from '../utils/axiosClient';

const adminRegisterSchema = z.object({
  firstName: z
    .string()
    .min(3, 'First name must be at least 3 characters')
    .max(20, 'First name must be at most 20 characters'),
  lastName: z
    .string()
    .max(20, 'Last name must be at most 20 characters')
    .optional()
    .refine((val) => !val || val.length >= 3, {
      message: 'Last name must be at least 3 characters if provided',
    }),
  emailId: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Must include at least one lowercase letter')
    .regex(/[A-Z]/, 'Must include at least one uppercase letter')
    .regex(/[0-9]/, 'Must include at least one number')
    .regex(/[^A-Za-z0-9]/, 'Must include at least one symbol'),
  age: z
    .string()
    .optional()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 6 && Number(val) <= 80), {
      message: 'Age must be a number between 6 and 80',
    }),
});

function AdminRegister() {
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(adminRegisterSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      emailId: '',
      password: '',
      age: '',
    },
  });

  const onSubmit = async (data) => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    // Clean payload so optional empty fields don't fail mongoose validation
    const payload = {
      firstName: data.firstName.trim(),
      emailId: data.emailId.trim().toLowerCase(),
      password: data.password,
    };

    if (data.lastName && data.lastName.trim().length > 0) {
      payload.lastName = data.lastName.trim();
    }
    if (data.age && !isNaN(Number(data.age))) {
      payload.age = Number(data.age);
    }

    try {
      const response = await axiosClient.post('/user/admin/register', payload);
      setSuccess(
        typeof response.data === 'string'
          ? response.data
          : 'New Admin registered successfully!'
      );
      reset();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to register admin'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-200 py-10 px-4">
      <div className="container mx-auto max-w-xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Register New Admin</h1>
            <p className="text-sm text-base-content/70 mt-1">
              Add a new administrator with elevated platform privileges
            </p>
          </div>
          <NavLink to="/admin" className="btn btn-ghost">
            Back
          </NavLink>
        </div>

        {/* Alerts */}
        {error && (
          <div className="alert alert-error mb-4 shadow-md">
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="alert alert-success mb-4 shadow-md">
            <span>{success}</span>
          </div>
        )}

        {/* Form Card */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* First Name & Last Name in one row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">First Name *</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Jane"
                    className={`input input-bordered w-full ${
                      errors.firstName ? 'input-error' : ''
                    }`}
                    {...register('firstName')}
                  />
                  {errors.firstName && (
                    <span className="text-error text-xs mt-1">
                      {errors.firstName.message}
                    </span>
                  )}
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Last Name</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Doe"
                    className={`input input-bordered w-full ${
                      errors.lastName ? 'input-error' : ''
                    }`}
                    {...register('lastName')}
                  />
                  {errors.lastName && (
                    <span className="text-error text-xs mt-1">
                      {errors.lastName.message}
                    </span>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Email Address *</span>
                </label>
                <input
                  type="email"
                  placeholder="admin@example.com"
                  className={`input input-bordered w-full ${
                    errors.emailId ? 'input-error' : ''
                  }`}
                  {...register('emailId')}
                />
                {errors.emailId && (
                  <span className="text-error text-xs mt-1">
                    {errors.emailId.message}
                  </span>
                )}
              </div>

              {/* Password */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Password *</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className={`input input-bordered w-full pr-10 ${
                      errors.password ? 'input-error' : ''
                    }`}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password ? (
                  <span className="text-error text-xs mt-1">
                    {errors.password.message}
                  </span>
                ) : (
                  <span className="text-xs text-base-content/60 mt-1">
                    Min 8 characters with upper, lower, number, and symbol.
                  </span>
                )}
              </div>

              {/* Age (Optional) */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Age (Optional)</span>
                </label>
                <input
                  type="number"
                  placeholder="25"
                  min="6"
                  max="80"
                  className={`input input-bordered w-full ${
                    errors.age ? 'input-error' : ''
                  }`}
                  {...register('age')}
                />
                {errors.age && (
                  <span className="text-error text-xs mt-1">
                    {errors.age.message}
                  </span>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary w-full"
                >
                  {submitting ? (
                    <>
                      <span className="loading loading-spinner"></span>
                      Registering Admin...
                    </>
                  ) : (
                    'Register Admin'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminRegister;

