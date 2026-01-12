# Políticas de Contraseña - iGAS Helpdesk

## Configuración en Supabase Dashboard

### 1. Acceder a la Configuración de Autenticación

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. En el menú lateral, selecciona **Authentication**
3. Haz clic en **Policies** en el submenu

### 2. Políticas de Contraseña Recomendadas para iGAS

#### Configuración Básica (Authentication → Settings)

```yaml
Minimum Password Length: 8 caracteres
Password Complexity: Habilitado
```

#### Políticas de Seguridad Implementadas

##### **A. Longitud Mínima**
- **Mínimo:** 8 caracteres
- **Recomendado:** 12 caracteres para administradores
- Ya implementado en el frontend (auth-signin.component.ts, auth-reset-password.component.ts)

##### **B. Complejidad de Contraseña**
Requisitos mínimos:
- ✅ Al menos 8 caracteres
- ✅ Al menos una letra minúscula
- ✅ Al menos una letra mayúscula
- ✅ Al menos un número
- ✅ Al menos un carácter especial (!@#$%^&*()_+-=[]{}|;:,.<>?)

##### **C. Contraseñas Comunes Prohibidas**
Supabase automáticamente bloquea contraseñas comunes como:
- `password123`
- `admin123`
- `12345678`
- Secuencias numéricas o alfabéticas
- Palabras del diccionario

##### **D. Historial de Contraseñas**
- No permitir reutilizar las últimas 5 contraseñas
- Implementación: Requiere tabla custom en Supabase

##### **E. Expiración de Contraseña**
- **Recomendado:** 90 días para usuarios regulares
- **Administradores:** 60 días
- Implementación: Requiere columna `password_changed_at` en tabla profiles

##### **F. Intentos Fallidos de Login**
- **Máximo:** 5 intentos fallidos
- **Bloqueo:** 15 minutos
- **Notificación:** Email al usuario
- Implementación: Supabase Rate Limiting + tabla custom

---

## Configuración en Supabase Dashboard (Paso a Paso)

### Paso 1: Configurar Longitud Mínima

**📖 Guía visual completa:** Ver `documentacion/PASSWORD_SETUP.html` para pasos detallados con capturas.

1. Ve a **Authentication → Settings**
2. En la sección **Password Policy**, configura:
   ```
   Minimum password length: 8
   ```
3. Haz clic en **Save**

### Paso 2: Habilitar Complejidad de Contraseña

En el mismo panel:
1. Activa el toggle **Require uppercase and lowercase letters**
2. Activa el toggle **Require numbers**
3. Activa el toggle **Require special characters**
4. Haz clic en **Save**

### Paso 3: Configurar Rate Limiting

1. Ve a **Authentication → Rate Limits**
2. Configura los siguientes límites:

```yaml
# Intentos de login
/auth/v1/token:
  interval: 15m
  requests: 5

# Recuperación de contraseña
/auth/v1/recover:
  interval: 1h
  requests: 3

# Cambio de contraseña
/auth/v1/user:
  interval: 1h
  requests: 5
```

3. Haz clic en **Save**

---

## Implementación de Políticas Avanzadas

### Tabla de Historial de Contraseñas

```sql
-- Crear tabla para historial de contraseñas
CREATE TABLE IF NOT EXISTS password_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsquedas rápidas
CREATE INDEX idx_password_history_user_id ON password_history(user_id);

-- RLS: Solo el usuario puede ver su propio historial
ALTER TABLE password_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own password history"
  ON password_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Función para guardar contraseña en historial
CREATE OR REPLACE FUNCTION save_password_to_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Guardar hash de contraseña anterior en historial
  IF TG_OP = 'UPDATE' AND OLD.encrypted_password IS DISTINCT FROM NEW.encrypted_password THEN
    INSERT INTO password_history (user_id, password_hash)
    VALUES (NEW.id, OLD.encrypted_password);

    -- Mantener solo las últimas 5 contraseñas
    DELETE FROM password_history
    WHERE user_id = NEW.id
    AND id NOT IN (
      SELECT id FROM password_history
      WHERE user_id = NEW.id
      ORDER BY created_at DESC
      LIMIT 5
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para guardar historial automáticamente
CREATE TRIGGER save_password_history_trigger
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION save_password_to_history();
```

### Columna de Fecha de Cambio de Contraseña

```sql
-- Agregar columna a tabla profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ DEFAULT NOW();

-- Función para actualizar fecha de cambio
CREATE OR REPLACE FUNCTION update_password_changed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.encrypted_password IS DISTINCT FROM NEW.encrypted_password THEN
    UPDATE profiles
    SET password_changed_at = NOW()
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
CREATE TRIGGER update_password_date_trigger
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION update_password_changed_at();
```

### Tabla de Intentos Fallidos de Login

```sql
-- Crear tabla para rastrear intentos fallidos
CREATE TABLE IF NOT EXISTS failed_login_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address INET,
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  user_agent TEXT
);

-- Índice para búsquedas por email
CREATE INDEX idx_failed_attempts_email ON failed_login_attempts(email);
CREATE INDEX idx_failed_attempts_time ON failed_login_attempts(attempted_at);

-- Función para limpiar intentos antiguos (>24 horas)
CREATE OR REPLACE FUNCTION cleanup_old_failed_attempts()
RETURNS void AS $$
BEGIN
  DELETE FROM failed_login_attempts
  WHERE attempted_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vista para ver usuarios bloqueados
CREATE OR REPLACE VIEW blocked_users AS
SELECT
  email,
  COUNT(*) as failed_attempts,
  MAX(attempted_at) as last_attempt,
  CASE
    WHEN MAX(attempted_at) > NOW() - INTERVAL '15 minutes'
    AND COUNT(*) >= 5
    THEN true
    ELSE false
  END as is_blocked
FROM failed_login_attempts
WHERE attempted_at > NOW() - INTERVAL '15 minutes'
GROUP BY email
HAVING COUNT(*) >= 5;

-- RLS: Solo admins pueden ver intentos fallidos
ALTER TABLE failed_login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view failed attempts"
  ON failed_login_attempts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.rol_id IN (
        SELECT id FROM roles WHERE nombre = 'Administrador'
      )
    )
  );
```

---

## Validación en Frontend

### Función de Validación de Complejidad (Ya implementada)

Archivo: `src/app/core/helpers/password-validator.ts` (crear si no existe)

```typescript
export interface PasswordStrength {
  valid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  errors: string[];
}

export function validatePasswordStrength(password: string): PasswordStrength {
  const errors: string[] = [];

  // Longitud mínima
  if (password.length < 8) {
    errors.push('La contraseña debe tener al menos 8 caracteres');
  }

  // Al menos una minúscula
  if (!/[a-z]/.test(password)) {
    errors.push('Debe contener al menos una letra minúscula');
  }

  // Al menos una mayúscula
  if (!/[A-Z]/.test(password)) {
    errors.push('Debe contener al menos una letra mayúscula');
  }

  // Al menos un número
  if (!/\d/.test(password)) {
    errors.push('Debe contener al menos un número');
  }

  // Al menos un carácter especial
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    errors.push('Debe contener al menos un carácter especial (!@#$%^&*...)');
  }

  // Calcular fortaleza
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (errors.length === 0) {
    if (password.length >= 12) {
      strength = 'strong';
    } else if (password.length >= 10) {
      strength = 'medium';
    }
  }

  return {
    valid: errors.length === 0,
    strength,
    errors
  };
}
```

---

## Checklist de Implementación

### ✅ Configuración Básica (Supabase Dashboard)
- [x] Longitud mínima de 8 caracteres
- [ ] Complejidad de contraseña habilitada
- [ ] Rate limiting configurado

### 🔄 Políticas Avanzadas (SQL)
- [ ] Tabla de historial de contraseñas creada
- [ ] Trigger de historial configurado
- [ ] Columna password_changed_at agregada
- [ ] Tabla de intentos fallidos creada
- [ ] Vista de usuarios bloqueados creada

### 📝 Frontend
- [ ] Validador de complejidad implementado
- [ ] Indicador visual de fortaleza
- [ ] Mensajes de error claros
- [ ] Prevención de contraseñas débiles

### 📊 Monitoreo
- [ ] Dashboard de intentos fallidos
- [ ] Alertas de seguridad
- [ ] Reportes de cambios de contraseña

---

## Políticas Recomendadas por Rol

### Administrador
- **Longitud:** Mínimo 12 caracteres
- **Complejidad:** Alta (todas las validaciones)
- **Expiración:** 60 días
- **2FA:** Obligatorio

### Coordinador/Supervisor
- **Longitud:** Mínimo 10 caracteres
- **Complejidad:** Alta
- **Expiración:** 90 días
- **2FA:** Recomendado

### Técnico/Agente
- **Longitud:** Mínimo 8 caracteres
- **Complejidad:** Media
- **Expiración:** 90 días
- **2FA:** Opcional

---

## Notas de Seguridad

1. **Nunca almacenar contraseñas en texto plano**
   - Supabase maneja automáticamente el hashing con bcrypt

2. **Comunicación Segura**
   - Usar HTTPS siempre (habilitado en Supabase)
   - Tokens en headers, nunca en URLs

3. **Educación de Usuarios**
   - Capacitar sobre contraseñas seguras
   - No compartir credenciales
   - Usar gestores de contraseñas

4. **Auditoría**
   - Registrar cambios de contraseña
   - Monitorear intentos fallidos
   - Alertas de actividad sospechosa

---

## Referencias

### Documentación del Proyecto
- **Guía Visual de Configuración**: `documentacion/PASSWORD_SETUP.html` - Guía paso a paso con interfaz visual
- **Script SQL de Implementación**: `database/migrations/09_password_policies.sql` - Políticas avanzadas

### Referencias Externas
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [OWASP Password Guidelines](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)

---

**Última actualización:** 12 de enero de 2026
**Autor:** iGAS Development Team
