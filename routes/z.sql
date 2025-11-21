-- Création de la base de données
CREATE DATABASE IF NOT EXISTS lycee;
USE lycee;

-- Table paren
CREATE TABLE IF NOT EXISTS parents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(50) NOT NULL,
  prenom VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(100) NOT NULL
);

-- Table enseignants
CREATE TABLE IF NOT EXISTS enseignants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(50) NOT NULL,
  prenom VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(100) NOT NULL
);

-- Table classes
CREATE TABLE IF NOT EXISTS classes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(50) NOT NULL,
  enseignant_id INT,
  FOREIGN KEY (enseignant_id) REFERENCES enseignants(id) ON DELETE SET NULL
);

-- Table élèves
CREATE TABLE IF NOT EXISTS eleves (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(50) NOT NULL,
  prenom VARCHAR(50) NOT NULL,
  parent_id INT,
  classe_id INT,
  FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE SET NULL,
  FOREIGN KEY (classe_id) REFERENCES classes(id) ON DELETE SET NULL
);

-- Table présences
CREATE TABLE IF NOT EXISTS presences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  eleve_id INT NOT NULL,
  date DATE NOT NULL,
  present BOOLEAN NOT NULL DEFAULT 1,
  heure_arrivee TIME NULL,
  FOREIGN KEY (eleve_id) REFERENCES eleves(id) ON DELETE CASCADE,
  UNIQUE KEY unique_eleve_date (eleve_id, date)
);

CREATE TABLE notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  enseignant_id INT NOT NULL,
  message TEXT NOT NULL,
  date DATETIME NOT NULL,
  lue BOOLEAN DEFAULT FALSE,
  eleve_id INT,
  FOREIGN KEY (enseignant_id) REFERENCES enseignants(id) ON DELETE CASCADE,
  FOREIGN KEY (eleve_id) REFERENCES eleves(id) ON DELETE SET NULL
);

-- Données test parents
INSERT INTO parents (nom, prenom, email, password) VALUES
('Ndiaye', 'Awa', 'awa.ndiaye@mail.com', 'password1'),
('Diallo', 'Moussa', 'moussa.diallo@mail.com', 'password2'),
('Kane', 'Aminata', 'amina.kane@mail.com', 'password3'),
('Sow', 'Abdoulaye', 'abdoul.sow@mail.com', 'password4');

-- Données test enseignants
INSERT INTO enseignants (nom, prenom, email, password) VALUES
('Kone', 'Fatou', 'fatou.kone@mail.com', '1234'),
('Traore', 'Ibrahim', 'ibrahim.traore@mail.com', '4567'),
('Diop', 'Mariama', 'mariama.diop@mail.com', '7890'),
('Ba', 'Modou', 'modou.ba@mail.com', '1011');

-- Données test classes
INSERT INTO classes (nom, enseignant_id) VALUES
('6ème A', 1),
('6ème B', 2),
('5ème A', 3),
('5ème B', 4),
('4ème A', 1),
('4ème B', 2);

-- Données test élèves
INSERT INTO eleves (nom, prenom, parent_id, classe_id) VALUES
-- 6ème A
('Ndiaye', 'Amadou', 1, 1),
('Diallo', 'Mariama', 2, 1),
('Sow', 'Fatima', 3, 1),
('Kane', 'Ibrahima', 4, 1),

-- 6ème B
('Traore', 'Aïcha', 1, 2),
('Diop', 'Moussa', 2, 2),
('Ba', 'Khadija', 3, 2),
('Fall', 'Ousmane', 4, 2),

-- 5ème A
('Gueye', 'Rokhaya', 1, 3),
('Mbaye', 'Cheikh', 2, 3),
('Niang', 'Aminata', 3, 3),
('Sy', 'Mamadou', 4, 3);

-- Données test présences (semaine du 18 au 24 août 2025)
INSERT INTO presences (eleve_id, date, present, heure_arrivee) VALUES
-- Lundi 18 août 2025
(1, '2025-08-18', 1, '08:15:00'),
(2, '2025-08-18', 0, NULL),
(3, '2025-08-18', 1, '08:05:00'),
(4, '2025-08-18', 1, '08:20:00'),
(5, '2025-08-18', 1, '08:10:00'),
(6, '2025-08-18', 1, '08:00:00'),
(7, '2025-08-18', 0, NULL),
(8, '2025-08-18', 1, '08:25:00'),
(9, '2025-08-18', 1, '08:15:00'),
(10, '2025-08-18', 1, '08:05:00'),
(11, '2025-08-18', 0, NULL),
(12, '2025-08-18', 1, '08:30:00'),

-- Mardi 19 août 2025
(1, '2025-08-19', 1, '08:10:00'),
(2, '2025-08-19', 1, '08:20:00'),
(3, '2025-08-19', 1, '08:05:00'),
(4, '2025-08-19', 0, NULL),
(5, '2025-08-19', 1, '08:15:00'),
(6, '2025-08-19', 1, '08:00:00'),
(7, '2025-08-19', 1, '08:25:00'),
(8, '2025-08-19', 1, '08:10:00'),
(9, '2025-08-19', 0, NULL),
(10, '2025-08-19', 1, '08:05:00'),
(11, '2025-08-19', 1, '08:20:00'),
(12, '2025-08-19', 1, '08:15:00'),

-- Mercredi 20 août 2025
(1, '2025-08-20', 1, '08:15:00'),
(2, '2025-08-20', 1, '08:05:00'),
(3, '2025-08-20', 0, NULL),
(4, '2025-08-20', 1, '08:20:00'),
(5, '2025-08-20', 1, '08:10:00'),
(6, '2025-08-20', 1, '08:00:00'),
(7, '2025-08-20', 1, '08:25:00'),
(8, '2025-08-20', 0, NULL),
(9, '2025-08-20', 1, '08:15:00'),
(10, '2025-08-20', 1, '08:05:00'),
(11, '2025-08-20', 1, '08:20:00'),
(12, '2025-08-20', 1, '08:30:00'),

-- Jeudi 21 août 2025
(1, '2025-08-21', 1, '08:10:00'),
(2, '2025-08-21', 0, NULL),
(3, '2025-08-21', 1, '08:05:00'),
(4, '2025-08-21', 1, '08:20:00'),
(5, '2025-08-21', 1, '08:15:00'),
(6, '2025-08-21', 1, '08:00:00'),
(7, '2025-08-21', 1, '08:25:00'),
(8, '2025-08-21', 1, '08:10:00'),
(9, '2025-08-21', 1, '08:15:00'),
(10, '2025-08-21', 0, NULL),
(11, '2025-08-21', 1, '08:20:00'),
(12, '2025-08-21', 1, '08:15:00'),

-- Vendredi 22 août 2025
(1, '2025-08-22', 1, '08:15:00'),
(2, '2025-08-22', 1, '08:05:00'),
(3, '2025-08-22', 1, '08:10:00'),
(4, '2025-08-22', 1, '08:20:00'),
(5, '2025-08-22', 0, NULL),
(6, '2025-08-22', 1, '08:00:00'),
(7, '2025-08-22', 1, '08:25:00'),
(8, '2025-08-22', 1, '08:10:00'),
(9, '2025-08-22', 1, '08:15:00'),
(10, '2025-08-22', 1, '08:05:00'),
(11, '2025-08-22', 0, NULL),
(12, '2025-08-22', 1, '08:30:00');

-- Vérification des données
SELECT 'Parents' as Table_Name, COUNT(*) as Count FROM parents
UNION ALL
SELECT 'Enseignants', COUNT(*) FROM enseignants
UNION ALL
SELECT 'Classes', COUNT(*) FROM classes
UNION ALL
SELECT 'Elèves', COUNT(*) FROM eleves
UNION ALL
SELECT 'Présences', COUNT(*) FROM presences;