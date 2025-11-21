import { useState, useEffect } from "react";

const API_BASE_URL = "http://localhost:5000/api";

export const useApi = (endpoint: string) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const res = await fetch(`${API_BASE_URL}/${endpoint}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  return { data, loading, fetchData };
};
