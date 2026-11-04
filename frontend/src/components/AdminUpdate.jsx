import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router';
import axiosClient, { getErrorMessage } from '../utils/axiosClient';
import ProblemForm from './ProblemForm';
import { buildDefaults } from './problemFormUtils';

// List of problems to pick from
function ProblemList() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axiosClient.get('/problem/getAllProblem');
        setProblems(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to fetch problems'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="flex justify-center p-10"><span className="loading loading-spinner loading-lg"></span></div>;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Update Problems</h1>
        <NavLink to="/admin" className="btn btn-ghost">Back</NavLink>
      </div>
      {error && <div className="alert alert-error mb-4"><span>{error}</span></div>}
      <table className="table table-zebra w-full">
        <thead>
          <tr><th>#</th><th>Title</th><th>Difficulty</th><th>Tag</th><th></th></tr>
        </thead>
        <tbody>
          {problems.map((p, i) => (
            <tr key={p._id}>
              <th>{i + 1}</th>
              <td>{p.title}</td>
              <td>{p.difficulty}</td>
              <td>{p.tags}</td>
              <td><NavLink to={`/admin/update/${p._id}`} className="btn btn-sm btn-warning">Edit</NavLink></td>
            </tr>
          ))}
        </tbody>
      </table>
      {problems.length === 0 && !error && <p className="text-center mt-6 text-base-content/60">No problems yet.</p>}
    </div>
  );
}

// Edit form for one problem
function EditProblem({ problemId }) {
  const navigate = useNavigate();
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axiosClient.get(`/problem/problemById/${problemId}`);
        setProblem(data);
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load problem'));
      } finally {
        setLoading(false);
      }
    })();
  }, [problemId]);

  const onSubmit = async (data) => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await axiosClient.put(`/problem/update/${problemId}`, data);
      setSuccess('Problem updated successfully');
      setTimeout(() => navigate('/admin/update'), 1200);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update problem'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center p-10"><span className="loading loading-spinner loading-lg"></span></div>;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Edit Problem</h1>
        <NavLink to="/admin/update" className="btn btn-ghost">Back</NavLink>
      </div>
      {error && <div className="alert alert-error mb-4"><span>{error}</span></div>}
      {success && <div className="alert alert-success mb-4"><span>{success}</span></div>}
      {problem && (
        <ProblemForm
          defaultValues={buildDefaults(problem)}
          onSubmit={onSubmit}
          submitLabel="Save Changes"
          submitting={submitting}
        />
      )}
    </div>
  );
}

function AdminUpdate() {
  const { problemId } = useParams();
  return problemId ? <EditProblem key={problemId} problemId={problemId} /> : <ProblemList />;
}

export default AdminUpdate;
