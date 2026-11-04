import { useEffect, useState } from 'react';
import axiosClient, { getErrorMessage } from '../utils/axiosClient'
import { NavLink } from 'react-router';

const AdminVideo = () => {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);


  useEffect(() => {
    fetchProblems();
  }, []);

  const fetchProblems = async () => {
    try {
      setLoading(true);
      const { data } = await axiosClient.get('/problem/getAllProblem');
      setProblems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to fetch problems'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this problem\'s solution video?')) return;
    
    try {
      await axiosClient.delete(`/video/delete/${id}`);
      setNotice('Video deleted successfully');
      setError(null);
    } catch (err) {
      setNotice(null);
      setError(getErrorMessage(err, 'Failed to delete video'));
    }
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Video Upload and Delete</h1>
        <NavLink to="/admin" className="btn btn-ghost">Back</NavLink>
      </div>

      {error && <div className="alert alert-error mb-4"><span>{error}</span></div>}
      {notice && <div className="alert alert-success mb-4"><span>{notice}</span></div>}

      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th className="w-1/12">#</th>
              <th className="w-4/12">Title</th>
              <th className="w-2/12">Difficulty</th>
              <th className="w-3/12">Tags</th>
              <th className="w-2/12">Upload</th>
              <th className="w-2/12">Delete</th>
            </tr>
          </thead>
          <tbody>
            {problems.map((problem, index) => (
              <tr key={problem._id}>
                <th>{index + 1}</th>
                <td>{problem.title}</td>
                <td>
                  <span className={`badge ${
                    String(problem.difficulty).toLowerCase() === 'easy' 
                      ? 'badge-success' 
                      : String(problem.difficulty).toLowerCase() === 'medium' 
                        ? 'badge-warning' 
                        : 'badge-error'
                  }`}>
                    {problem.difficulty}
                  </span>
                </td>
                <td>
                  <span className="badge badge-outline">
                    {problem.tags}
                  </span>
                </td>
                <td>
                  <div className="flex space-x-1">
                     <NavLink 
                        to={`/admin/upload/${problem._id}`}
                        className={`btn bg-blue-600`}
                        >
                        Upload
                    </NavLink>
                  </div>
                </td>
                <td>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleDelete(problem._id)}
                      className="btn btn-sm btn-error"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminVideo;