import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Interfaces
interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: string;
}

interface Classe {
  id: number;
  nom: string;
}

interface Eleve {
  id: number;
  nom: string;
  prenom: string;
  classe_id: number;
  parent_id: number;
  parent_nom?: string;
  parent_prenom?: string;
  classe?: string;
}

interface Presence {
  id: number;
  eleve_id: number;
  date: string;
  present: boolean;
  heure_arrivee: string | null;
  justification: string | null;
  eleve_nom: string;
  eleve_prenom: string;
}

interface Notification {
  id: number;
  message: string;
  type: string;
  date: string;
  lue: boolean;
  eleve_nom?: string;
  eleve_prenom?: string;
  parent_nom?: string;
  parent_prenom?: string;
}

// Composants
const LoginForm: React.FC<{ onLogin: (email: string, password: string) => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await onLogin(email, password);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur de connexion');
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2>Connexion</h2>
        {error && <div className="error-message">{error}</div>}
        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Mot de passe:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Se connecter</button>
      </form>
    </div>
  );
};

const Dashboard: React.FC<{ user: User }> = ({ user }) => {
  return (
    <div className="dashboard">
      <h2>Tableau de Bord</h2>
      <div className="user-info">
        <p>Bienvenue, {user.prenom} {user.nom}</p>
        <p>Rôle: {user.role}</p>
        <p>Email: {user.email}</p>
      </div>
      
      <div className="dashboard-actions">
        {user.role === 'admin' && (
          <div className="action-card">
            <h3>Administration</h3>
            <p>Gestion des enseignants et des classes</p>
            <a href="#/admin">Accéder au panel admin</a>
          </div>
        )}
        
        {(user.role === 'enseignant' || user.role === 'admin') && (
          <>
            <div className="action-card">
              <h3>Gestion des présences</h3>
              <p>Marquer les présences des élèves</p>
              <a href="#/presences">Gérer les présences</a>
            </div>
            <div className="action-card">
              <h3>Gestion des élèves</h3>
              <p>Ajouter, modifier ou supprimer des élèves</p>
              <a href="#/eleves">Gérer les élèves</a>
            </div>
          </>
        )}
        
        {user.role === 'parent' && (
          <div className="action-card">
            <h3>Suivi des présences</h3>
            <p>Consulter les présences de vos enfants</p>
            <a href="#/parent">Voir les présences</a>
          </div>
        )}

        {(user.role === 'enseignant' || user.role === 'admin' || user.role === 'parent') && (
          <div className="action-card">
            <h3>Notifications</h3>
            <p>Consulter vos notifications</p>
            <a href="#/notifications">Voir les notifications</a>
          </div>
        )}
      </div>
    </div>
  );
};

const PresenceManager: React.FC<{ user: User }> = ({ user }) => {
  const [classes, setClasses] = useState<Classe[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [presences, setPresences] = useState<Presence[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user.role === 'enseignant' || user.role === 'admin') {
      fetchClassesEnseignant();
    }
  }, [user]);

  const fetchClassesEnseignant = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/enseignant/classes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClasses(response.data.classes);
    } catch (error) {
      console.error('Erreur fetch classes:', error);
    }
  };

  const fetchElevesClasse = async (classeId: number) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/classe/${classeId}/eleves`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEleves(response.data.eleves);
      setSelectedClass(classeId);
      fetchPresencesDate(classeId);
    } catch (error) {
      console.error('Erreur fetch élèves classe:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPresencesDate = async (classeId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5000/api/presences/date', {
        date,
        classeId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPresences(response.data.data);
    } catch (error) {
      console.error('Erreur fetch présences date:', error);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setDate(newDate);
    if (selectedClass) {
      fetchPresencesDate(selectedClass);
    }
  };

  const updatePresence = async (eleveId: number, present: boolean) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/presences', {
        eleve_id: eleveId,
        date,
        present,
        heure_arrivee: present ? new Date().toTimeString().split(' ')[0] : null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Mettre à jour l'état local
      setPresences(prev => {
        const existing = prev.find(p => p.eleve_id === eleveId && p.date === date);
        if (existing) {
          return prev.map(p => 
            p.eleve_id === eleveId && p.date === date 
              ? { ...p, present, heure_arrivee: present ? new Date().toTimeString().split(' ')[0] : null }
              : p
          );
        } else {
          return [
            ...prev,
            {
              id: Date.now(),
              eleve_id: eleveId,
              date,
              present,
              heure_arrivee: present ? new Date().toTimeString().split(' ')[0] : null,
              justification: null,
              eleve_nom: eleves.find(e => e.id === eleveId)?.nom || '',
              eleve_prenom: eleves.find(e => e.id === eleveId)?.prenom || ''
            }
          ];
        }
      });
      
      setMessage('Présence enregistrée avec succès');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Erreur mise à jour présence:', error);
      setMessage('Erreur lors de l\'enregistrement');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div className="presence-manager">
      <h2>Gestion des Présences</h2>
      
      {message && <div className="message">{message}</div>}
      
      <div className="filters">
        <div className="form-group">
          <label>Date:</label>
          <input
            type="date"
            value={date}
            onChange={handleDateChange}
          />
        </div>
        
        <div className="form-group">
          <label>Classe:</label>
          <select
            value={selectedClass || ''}
            onChange={(e) => {
              const classeId = Number(e.target.value);
              if (classeId) {
                fetchElevesClasse(classeId);
              } else {
                setSelectedClass(null);
                setEleves([]);
                setPresences([]);
              }
            }}
          >
            <option value="">Sélectionner une classe</option>
            {classes.map(classe => (
              <option key={classe.id} value={classe.id}>
                {classe.nom}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <div className="loading">Chargement...</div>}

      {selectedClass && eleves.length > 0 && (
        <div className="presence-list">
          <h3>Liste des élèves - {classes.find(c => c.id === selectedClass)?.nom}</h3>
          <table>
            <thead>
              <tr>
                <th>Élève</th>
                <th>Présent</th>
                <th>Absent</th>
                <th>Heure d'arrivée</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {eleves.map(eleve => {
                const presence = presences.find(p => p.eleve_id === eleve.id);
                const status = presence ? (presence.present ? 'Présent' : 'Absent') : 'Non renseigné';
                
                return (
                  <tr key={eleve.id}>
                    <td>{eleve.prenom} {eleve.nom}</td>
                    <td>
                      <input
                        type="radio"
                        name={`presence-${eleve.id}`}
                        checked={presence?.present === true}
                        onChange={() => updatePresence(eleve.id, true)}
                      />
                    </td>
                    <td>
                      <input
                        type="radio"
                        name={`presence-${eleve.id}`}
                        checked={presence?.present === false}
                        onChange={() => updatePresence(eleve.id, false)}
                      />
                    </td>
                    <td>{presence?.heure_arrivee || '-'}</td>
                    <td className={status.toLowerCase().replace(' ', '-')}>
                      {status}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const EleveManager: React.FC<{ user: User }> = ({ user }) => {
  const [classes, setClasses] = useState<Classe[]>([]);
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [parents, setParents] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEleve, setNewEleve] = useState({
    nom: '',
    prenom: '',
    classe_id: '',
    parent_email: ''
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchClassesEnseignant();
    fetchParents();
  }, []);

  const fetchClassesEnseignant = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/enseignant/classes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClasses(response.data.classes);
    } catch (error) {
      console.error('Erreur fetch classes:', error);
    }
  };

  const fetchParents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/parents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setParents(response.data.parents);
    } catch (error) {
      console.error('Erreur fetch parents:', error);
    }
  };

  const fetchElevesClasse = async (classeId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/classe/${classeId}/eleves`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEleves(response.data.eleves);
      setSelectedClass(classeId);
    } catch (error) {
      console.error('Erreur fetch élèves classe:', error);
    }
  };

const addEleve = async () => {
  if (!newEleve.nom || !newEleve.prenom || !newEleve.classe_id || !newEleve.parent_email) {
    setMessage('Veuillez remplir tous les champs');
    setTimeout(() => setMessage(''), 3000);
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const payload = {
      nom: newEleve.nom,
      prenom: newEleve.prenom,
      classe_id: Number(newEleve.classe_id), // ✅ conversion ici
      parent_email: newEleve.parent_email
    };

    await axios.post('http://localhost:5000/api/eleves', payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    setNewEleve({ nom: '', prenom: '', classe_id: '', parent_email: '' });
    setShowAddForm(false);
    if (selectedClass) {
      fetchElevesClasse(selectedClass);
    }
    setMessage('Élève ajouté avec succès');
    setTimeout(() => setMessage(''), 3000);
  } catch (error) {
    console.error('Erreur ajout élève:', error);
    setMessage('Erreur lors de l\'ajout de l\'élève');
    setTimeout(() => setMessage(''), 3000);
  }
};

  const deleteEleve = async (id: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet élève ?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:5000/api/eleves/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (selectedClass) {
          fetchElevesClasse(selectedClass);
        }
        setMessage('Élève supprimé avec succès');
        setTimeout(() => setMessage(''), 3000);
      } catch (error) {
        console.error('Erreur suppression élève:', error);
        setMessage('Erreur lors de la suppression');
        setTimeout(() => setMessage(''), 3000);
      }
    }
  };

  return (
    <div className="eleve-manager">
      <h2>Gestion des Élèves</h2>
      
      {message && <div className="message">{message}</div>}
      
      <div className="filters">
        <div className="form-group">
          <label>Classe:</label>
          <select
            value={selectedClass || ''}
            onChange={(e) => {
              const classeId = Number(e.target.value);
              if (classeId) {
                fetchElevesClasse(classeId);
              } else {
                setSelectedClass(null);
                setEleves([]);
              }
            }}
          >
            <option value="">Sélectionner une classe</option>
            {classes.map(classe => (
              <option key={classe.id} value={classe.id}>
                {classe.nom}
              </option>
            ))}
          </select>
        </div>
        
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="toggle-form-btn"
        >
          {showAddForm ? 'Annuler' : 'Ajouter un élève'}
        </button>
      </div>

      {showAddForm && (
        <div className="add-form">
          <h3>Nouvel Élève</h3>
          <div className="form-row">
            <div className="form-group">
              <input
                type="text"
                placeholder="Nom"
                value={newEleve.nom}
                onChange={(e) => setNewEleve({...newEleve, nom: e.target.value})}
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                placeholder="Prénom"
                value={newEleve.prenom}
                onChange={(e) => setNewEleve({...newEleve, prenom: e.target.value})}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <select
                value={newEleve.classe_id}
                onChange={(e) => setNewEleve({...newEleve, classe_id: e.target.value})}
              >
                <option value="">Sélectionner une classe</option>
                {classes.map(classe => (
                  <option key={classe.id} value={classe.id}>
                    {classe.nom}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <input
                type="email"
                placeholder="Email du parent"
                value={newEleve.parent_email}
                onChange={(e) => setNewEleve({...newEleve, parent_email: e.target.value})}
              />
            </div>
          </div>
          <button onClick={addEleve} className="add-btn">Ajouter l'élève</button>
        </div>
      )}

      {selectedClass && eleves.length > 0 && (
        <div className="eleves-list">
          <h3>Élèves de {classes.find(c => c.id === selectedClass)?.nom}</h3>
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Prénom</th>
                <th>Parent</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {eleves.map(eleve => (
                <tr key={eleve.id}>
                  <td>{eleve.nom}</td>
                  <td>{eleve.prenom}</td>
                  <td>{eleve.parent_prenom} {eleve.parent_nom}</td>
                  <td>
                    <button 
                      onClick={() => deleteEleve(eleve.id)}
                      className="delete-btn"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const NotificationManager: React.FC<{ user: User }> = ({ user }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchNotifications();
  }, [user]);

const fetchNotifications = async () => {
  try {
    const token = localStorage.getItem('token');
    let endpoint = '';
    
    if (user.role === 'enseignant') {
      endpoint = '/api/notifications/enseignant';
    } else if (user.role === 'parent') {
      endpoint = '/api/notifications/parent';
    } else if (user.role === 'admin') {
      endpoint = '/api/admin/notifications';
    } else {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const response = await axios.get(`http://localhost:5000${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    setNotifications(response.data.notifications || []);
  } catch (error) {
    console.error('Erreur fetch notifications:', error);
    setMessage('Erreur lors du chargement des notifications');
    setNotifications([]);
  } finally {
    setLoading(false);
  }
};

  const markAsRead = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/notifications/${id}/lire`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Mettre à jour l'état local
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, lue: true } : n
      ));
    } catch (error) {
      console.error('Erreur marquer notification comme lue:', error);
    }
  };

  if (loading) {
    return <div className="loading">Chargement des notifications...</div>;
  }

  return (
    <div className="notification-manager">
      <h2>Notifications</h2>
      
      {message && <div className="message">{message}</div>}
      
      {notifications.length === 0 ? (
        <p>Aucune notification</p>
      ) : (
        <div className="notifications-list">
          {notifications.map(notification => (
            <div key={notification.id} className={`notification ${notification.lue ? 'lue' : 'non-lue'}`}>
              <div className="notification-header">
                <span className="notification-type">{notification.type}</span>
                <span className="notification-date">
                  {new Date(notification.date).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <div className="notification-content">
                <p>{notification.message}</p>
                {notification.eleve_nom && (
                  <p className="notification-eleve">
                    Élève: {notification.eleve_prenom} {notification.eleve_nom}
                  </p>
                )}
                {notification.parent_nom && (
                  <p className="notification-parent">
                    Parent: {notification.parent_prenom} {notification.parent_nom}
                  </p>
                )}
              </div>
              {!notification.lue && (
                <button 
                  onClick={() => markAsRead(notification.id)}
                  className="mark-read-btn"
                >
                  Marquer comme lu
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ParentView: React.FC<{ user: User }> = ({ user }) => {
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [selectedEleve, setSelectedEleve] = useState<number | null>(null);
  const [presences, setPresences] = useState<Presence[]>([]);
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchElevesParent();
  }, [user]);

  const fetchElevesParent = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/eleves/parent/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEleves(response.data.eleves);
      if (response.data.eleves.length > 0) {
        setSelectedEleve(response.data.eleves[0].id);
      }
    } catch (error) {
      console.error('Erreur fetch élèves parent:', error);
    }
  };

  const fetchPresencesSemaine = async (eleveId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/presences/eleves/semaine', {
        params: {
          eleveIds: eleveId,
          debut: startDate,
          fin: endDate
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      setPresences(response.data.presences);
    } catch (error) {
      console.error('Erreur fetch présences semaine:', error);
    }
  };

  useEffect(() => {
    if (selectedEleve) {
      fetchPresencesSemaine(selectedEleve);
    }
  }, [selectedEleve, startDate, endDate]);

  const justifyAbsence = async (presenceId: number, justification: string) => {
    if (!justification.trim()) {
      setMessage('Veuillez saisir un motif de justification');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/presences/${presenceId}/justifier`, {
        justification
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Mettre à jour l'état local
      setPresences(prev => prev.map(p => 
        p.id === presenceId 
          ? { ...p, present: true, justification }
          : p
      ));
      
      setMessage('Absence justifiée avec succès');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Erreur justification absence:', error);
      setMessage('Erreur lors de la justification');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div className="parent-view">
      <h2>Suivi des Présences</h2>
      
      {message && <div className="message">{message}</div>}
      
      <div className="filters">
        <div className="form-group">
          <label>Élève:</label>
          <select
            value={selectedEleve || ''}
            onChange={(e) => setSelectedEleve(Number(e.target.value))}
          >
            {eleves.map(eleve => (
              <option key={eleve.id} value={eleve.id}>
                {eleve.prenom} {eleve.nom} - {eleve.classe}
              </option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label>Du:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        
        <div className="form-group">
          <label>Au:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {selectedEleve && (
        <>
          <h3>Présences de {eleves.find(e => e.id === selectedEleve)?.prenom}</h3>
          
          {presences.length > 0 ? (
            <div className="presence-list">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Statut</th>
                    <th>Heure d'arrivée</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {presences.map(presence => (
                    <tr key={presence.id}>
                      <td>{new Date(presence.date).toLocaleDateString('fr-FR')}</td>
                      <td>
                        {presence.present ? (
                          <span className="present">Présent</span>
                        ) : (
                          <span className="absent">Absent</span>
                        )}
                      </td>
                      <td>{presence.heure_arrivee || '-'}</td>
                      <td>
                        {!presence.present && !presence.justification && (
                          <button
                            onClick={() => {
                              const justification = prompt('Motif de l\'absence:');
                              if (justification) {
                                justifyAbsence(presence.id, justification);
                              }
                            }}
                            className="justify-btn"
                          >
                            Justifier
                          </button>
                        )}
                        {presence.justification && (
                          <span className="justified">Justifié: {presence.justification}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>Aucune présence enregistrée pour cette période.</p>
          )}
        </>
      )}
    </div>
  );
};

const AdminPanel: React.FC<{ user: User }> = ({ user }) => {
  const [enseignants, setEnseignants] = useState<any[]>([]);
  const [parents, setParents] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEnseignant, setNewEnseignant] = useState({
    nom: '',
    prenom: '',
    email: '',
    password: ''
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchEnseignants();
    fetchParents();
  }, []);

  const fetchEnseignants = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/admin/enseignants', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEnseignants(response.data.enseignants);
    } catch (error) {
      console.error('Erreur fetch enseignants:', error);
    }
  };

  const fetchParents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/parents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setParents(response.data.parents);
    } catch (error) {
      console.error('Erreur fetch parents:', error);
    }
  };

  const addEnseignant = async () => {
    if (!newEnseignant.nom || !newEnseignant.prenom || !newEnseignant.email || !newEnseignant.password) {
      setMessage('Veuillez remplir tous les champs');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/admin/enseignants', newEnseignant, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewEnseignant({ nom: '', prenom: '', email: '', password: '' });
      setShowAddForm(false);
      fetchEnseignants();
      setMessage('Enseignant créé avec succès');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Erreur ajout enseignant:', error);
      setMessage('Erreur lors de la création');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const deleteEnseignant = async (id: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet enseignant ?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:5000/api/admin/enseignants/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchEnseignants();
        setMessage('Enseignant supprimé avec succès');
        setTimeout(() => setMessage(''), 3000);
      } catch (error) {
        console.error('Erreur suppression enseignant:', error);
        setMessage('Erreur lors de la suppression');
        setTimeout(() => setMessage(''), 3000);
      }
    }
  };

  return (
    <div className="admin-panel">
      <h2>Panel d'Administration</h2>
      
      {message && <div className="message">{message}</div>}
      
      <div className="admin-sections">
        <div className="enseignants-section">
          <h3>Gestion des Enseignants</h3>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="toggle-form-btn"
          >
            {showAddForm ? 'Annuler' : 'Ajouter un enseignant'}
          </button>
          
          {showAddForm && (
            <div className="add-form">
              <h4>Nouvel Enseignant</h4>
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Nom"
                  value={newEnseignant.nom}
                  onChange={(e) => setNewEnseignant({...newEnseignant, nom: e.target.value})}
                />
              </div>
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Prénom"
                  value={newEnseignant.prenom}
                  onChange={(e) => setNewEnseignant({...newEnseignant, prenom: e.target.value})}
                />
              </div>
              <div className="form-group">
                <input
                  type="email"
                  placeholder="Email"
                  value={newEnseignant.email}
                  onChange={(e) => setNewEnseignant({...newEnseignant, email: e.target.value})}
                />
              </div>
              <div className="form-group">
                <input
                  type="password"
                  placeholder="Mot de passe"
                  value={newEnseignant.password}
                  onChange={(e) => setNewEnseignant({...newEnseignant, password: e.target.value})}
                />
              </div>
              <button onClick={addEnseignant} className="add-btn">Ajouter</button>
            </div>
          )}
          
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Prénom</th>
                  <th>Email</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {enseignants.map(enseignant => (
                  <tr key={enseignant.id}>
                    <td>{enseignant.nom}</td>
                    <td>{enseignant.prenom}</td>
                    <td>{enseignant.email}</td>
                    <td>
                      <button 
                        onClick={() => deleteEnseignant(enseignant.id)}
                        className="delete-btn"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="parents-section">
          <h3>Liste des Parents</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Prénom</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {parents.map(parent => (
                  <tr key={parent.id}>
                    <td>{parent.nom}</td>
                    <td>{parent.prenom}</td>
                    <td>{parent.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const Navigation: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
  const navigate = useNavigate();

  return (
    <nav className="navigation">
      <div className="nav-brand" onClick={() => navigate('/')}>
        🏫 Lycée Management
      </div>
      <div className="nav-links">
        <span>Bienvenue, {user.prenom}</span>
        <div className="nav-menu">
          <button onClick={() => navigate('/')}>Dashboard</button>
          {(user.role === 'enseignant' || user.role === 'admin') && (
            <>
              <button onClick={() => navigate('/presences')}>Présences</button>
              <button onClick={() => navigate('/eleves')}>Élèves</button>
            </>
          )}
          {user.role === 'parent' && (
            <button onClick={() => navigate('/parent')}>Mes Enfants</button>
          )}
          {user.role === 'admin' && (
            <button onClick={() => navigate('/admin')}>Admin</button>
          )}
          <button onClick={() => navigate('/notifications')}>Notifications</button>
          <button onClick={onLogout} className="logout-btn">Déconnexion</button>
        </div>
      </div>
    </nav>
  );
};

// Composant principal
const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUserInfo();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data.user);
    } catch (error) {
      console.error('Erreur récupération info utilisateur:', error);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password
      });
      
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
    } catch (error: any) {
      throw error;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) {
    return <div className="loading-full">Chargement...</div>;
  }

  return (
    <Router>
      <div className="App">
        {user ? (
          <>
            <Navigation user={user} onLogout={handleLogout} />
            <div className="main-content">
              <Routes>
                <Route path="/" element={<Dashboard user={user} />} />
                <Route 
                  path="/presences" 
                  element={
                    user.role === 'enseignant' || user.role === 'admin' ? (
                      <PresenceManager user={user} />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  } 
                />
                <Route 
                  path="/eleves" 
                  element={
                    user.role === 'enseignant' || user.role === 'admin' ? (
                      <EleveManager user={user} />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  } 
                />
                <Route 
                  path="/notifications" 
                  element={<NotificationManager user={user} />} 
                />
                <Route 
                  path="/parent" 
                  element={
                    user.role === 'parent' ? (
                      <ParentView user={user} />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  } 
                />
                <Route 
                  path="/admin" 
                  element={
                    user.role === 'admin' ? (
                      <AdminPanel user={user} />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  } 
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </>
        ) : (
          <LoginForm onLogin={handleLogin} />
        )}
      </div>
    </Router>
  );
};

export default App;