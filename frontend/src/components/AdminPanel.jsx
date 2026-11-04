import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import axiosClient, { getErrorMessage } from '../utils/axiosClient';
import ProblemForm from './ProblemForm';
import { buildDefaults } from './problemFormUtils';

function AdminPanel() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const onSubmit = async (data) => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await axiosClient.post('/problem/create', data);
      setSuccess('Problem created successfully');
      setTimeout(() => navigate('/admin'), 1200);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create problem'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Create Problem</h1>
        <NavLink to="/admin" className="btn btn-ghost">Back</NavLink>
      </div>
      {error && <div className="alert alert-error mb-4"><span>{error}</span></div>}
      {success && <div className="alert alert-success mb-4"><span>{success}</span></div>}
      <ProblemForm
        defaultValues={buildDefaults(null)}
        onSubmit={onSubmit}
        submitLabel="Create Problem"
        submitting={submitting}
      />
    </div>
  );
}

export default AdminPanel;
