import { useApi } from "../hooks/useApi";

export const DashboardEnseignant = () => {
  const { data: presences, loading } = useApi("presences");

  return (
    <div>
      <h2>Tableau de bord Enseignant</h2>
      {loading ? <p>Chargement...</p> :
        <ul>
          {presences.map((p: any) => (
            <li key={p.id}>Élève ID: {p.eleve_id} - Date: {p.date} - Présent: {p.present ? "Oui" : "Non"}</li>
          ))}
        </ul>
      }
    </div>
  );
};
