import axios from "axios";

const axiosClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Turn any axios error into a readable string
export const getErrorMessage = (error, fallback = 'Something went wrong') => {
    const data = error?.response?.data;
    if (typeof data === 'string' && data) return data;
    if (data && typeof data === 'object') return data.error || data.message || fallback;
    return error?.message || fallback;
};

export default axiosClient;
