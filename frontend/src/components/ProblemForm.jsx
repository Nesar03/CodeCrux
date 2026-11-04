import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LANGUAGES } from './problemFormUtils';

const problemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  tags: z.enum(['array', 'linkedList', 'graph', 'dp']),
  visibleTestCases: z.array(z.object({
    input: z.string().min(1, 'Input is required'),
    output: z.string().min(1, 'Output is required'),
    explanation: z.string().min(1, 'Explanation is required'),
  })).min(1, 'Add at least one visible test case'),
  hiddenTestCases: z.array(z.object({
    input: z.string().min(1, 'Input is required'),
    output: z.string().min(1, 'Output is required'),
  })).min(1, 'Add at least one hidden test case'),
  startCode: z.array(z.object({
    language: z.string(),
    initialCode: z.string().min(1, 'Initial code is required'),
  })).length(3),
  referenceSolution: z.array(z.object({
    language: z.string(),
    completeCode: z.string().min(1, 'Reference solution is required'),
  })).length(3),
});

const FieldError = ({ error }) =>
  error ? <span className="text-error text-sm mt-1">{error.message}</span> : null;

function ProblemForm({ defaultValues, onSubmit, submitLabel, submitting }) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(problemSchema),
    defaultValues,
  });

  const visible = useFieldArray({ control, name: 'visibleTestCases' });
  const hidden = useFieldArray({ control, name: 'hiddenTestCases' });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic information */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h2 className="card-title">Basic Information</h2>

          <div className="form-control flex flex-col gap-1">
            <label className="label"><span className="label-text">Title</span></label>
            <input {...register('title')} placeholder="Two Sum"
              className={`input input-bordered w-full ${errors.title ? 'input-error' : ''}`} />
            <FieldError error={errors.title} />
          </div>

          <div className="form-control flex flex-col gap-1">
            <label className="label"><span className="label-text">Description</span></label>
            <textarea {...register('description')} rows={6}
              className={`textarea textarea-bordered w-full ${errors.description ? 'textarea-error' : ''}`} />
            <FieldError error={errors.description} />
          </div>

          <div className="flex gap-4">
            <div className="form-control flex-1 flex flex-col gap-1">
              <label className="label"><span className="label-text">Difficulty</span></label>
              <select {...register('difficulty')} className="select select-bordered w-full">
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="form-control flex-1 flex flex-col gap-1">
              <label className="label"><span className="label-text">Tag</span></label>
              <select {...register('tags')} className="select select-bordered w-full">
                <option value="array">Array</option>
                <option value="linkedList">Linked List</option>
                <option value="graph">Graph</option>
                <option value="dp">DP</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Visible test cases */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <div className="flex justify-between items-center">
            <h2 className="card-title">Visible Test Cases</h2>
            <button type="button" className="btn btn-sm btn-primary"
              onClick={() => visible.append({ input: '', output: '', explanation: '' })}>
              Add Case
            </button>
          </div>
          <FieldError error={errors.visibleTestCases?.root || errors.visibleTestCases} />
          {visible.fields.map((field, index) => (
            <div key={field.id} className="border border-base-300 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Case {index + 1}</span>
                <button type="button" className="btn btn-xs btn-error"
                  disabled={visible.fields.length === 1}
                  onClick={() => visible.remove(index)}>Remove</button>
              </div>
              <input {...register(`visibleTestCases.${index}.input`)} placeholder="Input" className="input input-bordered w-full" />
              <FieldError error={errors.visibleTestCases?.[index]?.input} />
              <input {...register(`visibleTestCases.${index}.output`)} placeholder="Output" className="input input-bordered w-full" />
              <FieldError error={errors.visibleTestCases?.[index]?.output} />
              <textarea {...register(`visibleTestCases.${index}.explanation`)} placeholder="Explanation" rows={2} className="textarea textarea-bordered w-full" />
              <FieldError error={errors.visibleTestCases?.[index]?.explanation} />
            </div>
          ))}
        </div>
      </div>

      {/* Hidden test cases */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <div className="flex justify-between items-center">
            <h2 className="card-title">Hidden Test Cases</h2>
            <button type="button" className="btn btn-sm btn-primary"
              onClick={() => hidden.append({ input: '', output: '' })}>
              Add Case
            </button>
          </div>
          <FieldError error={errors.hiddenTestCases?.root || errors.hiddenTestCases} />
          {hidden.fields.map((field, index) => (
            <div key={field.id} className="border border-base-300 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Case {index + 1}</span>
                <button type="button" className="btn btn-xs btn-error"
                  disabled={hidden.fields.length === 1}
                  onClick={() => hidden.remove(index)}>Remove</button>
              </div>
              <input {...register(`hiddenTestCases.${index}.input`)} placeholder="Input" className="input input-bordered w-full" />
              <FieldError error={errors.hiddenTestCases?.[index]?.input} />
              <input {...register(`hiddenTestCases.${index}.output`)} placeholder="Output" className="input input-bordered w-full" />
              <FieldError error={errors.hiddenTestCases?.[index]?.output} />
            </div>
          ))}
        </div>
      </div>

      {/* Code templates */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h2 className="card-title">Code Templates</h2>
          {LANGUAGES.map((language, index) => (
            <div key={language} className="space-y-2">
              <h3 className="font-medium">{language}</h3>
              <input type="hidden" {...register(`startCode.${index}.language`)} value={language} />
              <label className="label"><span className="label-text">Initial Code</span></label>
              <textarea {...register(`startCode.${index}.initialCode`)} rows={6}
                className="textarea textarea-bordered w-full font-mono text-sm" />
              <FieldError error={errors.startCode?.[index]?.initialCode} />

              <input type="hidden" {...register(`referenceSolution.${index}.language`)} value={language} />
              <label className="label"><span className="label-text">Reference Solution (must pass all visible test cases)</span></label>
              <textarea {...register(`referenceSolution.${index}.completeCode`)} rows={6}
                className="textarea textarea-bordered w-full font-mono text-sm" />
              <FieldError error={errors.referenceSolution?.[index]?.completeCode} />
            </div>
          ))}
        </div>
      </div>

      <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
        {submitting ? <span className="loading loading-spinner"></span> : submitLabel}
      </button>
    </form>
  );
}

export default ProblemForm;
