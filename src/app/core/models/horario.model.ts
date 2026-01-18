// ============================================================================
// Horario Model
// ============================================================================

export interface Horario {
  id: string;
  nombre: string;
  hora_inicio: string; // TIME format: "HH:MM"
  hora_fin: string;    // TIME format: "HH:MM"
  dias_semana: string[]; // ['Lunes', 'Martes', ...]
  created_at: string;
  updated_at: string;
}
