# Guía de Solución de Problemas - Variables de Entorno en Vercel

## 🔍 Diagnóstico: ¿Por qué no funcionan las variables?

### Problema 1: Variables no definidas en Vercel Dashboard

**Síntoma**: Error `Cannot read property of undefined` en Supabase

**Solución**:
1. Ve a **Vercel Dashboard** → Tu proyecto
2. **Settings** → **Environment Variables**
3. Agrega ambas variables:
   ```
   VITE_SUPABASE_URL=https://isgzovddlwckdqjwntjo.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGc...
   ```
4. **IMPORTANTE**: Selecciona dónde aplica:
   - ✅ Preview (desarrollo)
   - ✅ Production (producción)
5. **Redeploy** el proyecto (no solo rebuild)

### Problema 2: Build se ejecutó ANTES de agregar variables

**Síntoma**: Deploy exitoso pero variables vacías en producción

**Solución**:
1. Ve a **Deployments**
2. Haz clic en el último deploy
3. Haz clic en **Redeploy**
4. Selecciona **Use Existing Commit** (no es un nuevo commit)

### Problema 3: Variables se ven en dev pero no en producción

**Síntoma**: Funciona con `npm run dev` pero no en `npm run preview` o en Vercel

**Solución**:
```bash
# Construye la versión de producción localmente
npm run build

# Prueba localmente
npm run preview

# ¿Funciona? Entonces el problema está en Vercel
# ¿No funciona? Entonces está en tu código local
```

### Problema 4: Error `import.meta.env` es undefined

**Síntoma**: Console error: `Cannot read property 'env' of undefined`

**Verificación**:
```javascript
// Abre console (F12) y ejecuta:
console.log(import.meta.env.VITE_SUPABASE_URL)

// Debería mostrar:
// https://isgzovddlwckdqjwntjo.supabase.co

// Si muestra undefined, las variables no se inyectaron
```

---

## ✅ Checklist de Configuración Correcta

### En Vercel Dashboard
- [ ] Variables definidas en **Settings** → **Environment Variables**
- [ ] Variables aplican a **Preview** Y **Production**
- [ ] Variables tienen formato correcto (sin espacios)
- [ ] Proyecto está **redeployed** (no solo rebuilt)

### En tu código
- [ ] Variables tienen prefijo `VITE_`
- [ ] Se acceden con `import.meta.env.VITE_VARIABLE`
- [ ] No hay typos en nombres de variables

### En archivos de configuración
- [ ] `vite.config.js` tiene `define` para las variables ✅
- [ ] `.gitignore` excluye `.env` ✅
- [ ] `.vercelignore` no excluye `.env.example` ✅

---

## 🧪 Tests para Verificar

### Test 1: Verificar en build local
```bash
# Build de producción
npm run build

# Ver si la variable está en el bundle
grep -r "isgzovddlwckdqjwntjo" dist/

# Si la ves, está correctamente inyectada ✅
# Si no la ves, el build no inyectó la variable ❌
```

### Test 2: Verificar en console de navegador
1. Abre https://bodyhealtgym.vercel.app
2. Abre DevTools (F12)
3. Console tab
4. Ejecuta:
```javascript
fetch('/__vite_ping').then(() => {
  console.log('Vite está funcionando')
})

// O verifica directamente:
window.__ENV__
```

### Test 3: Verificar logs de Vercel
1. Ve a **Deployments** → último deploy
2. Haz clic en **Logs**
3. Busca `VITE_` en los logs
4. Deberías ver algo como:
```
VITE_SUPABASE_URL=https://isgzovddlwckdqjwntjo...
```

---

## 🔧 Soluciones Rápidas

### Solución 1: Redeploy Completo
```bash
# En tu máquina:
git commit --allow-empty -m "Trigger redeploy"
git push origin main

# Vercel detectará cambios y redeployará
```

### Solución 2: Trigger Manual desde Vercel
1. **Deployments** → último deploy
2. Click en los **3 puntitos**
3. Selecciona **Redeploy**

### Solución 3: Limpiar y volver a deployar
1. Elimina todas las variables de Environment
2. Vuelve a agregarlas (copia/pega directamente)
3. Redeploy

---

## 📊 Variables Configuradas Correctamente

Si todo está bien, en `src/lib/supabase.js` deberías ver:

```javascript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// Resultado: "https://isgzovddlwckdqjwntjo.supabase.co"

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
// Resultado: "eyJhbGc..."
```

Y en el navegador (console):
```javascript
fetch(import.meta.env.VITE_SUPABASE_URL)
// Debería hacer una petición a Supabase sin errores
```

---

## 🆘 Si nada funciona

1. **Verifica que Supabase esté online**:
   - Ve a https://www.vercelstatus.com
   - Ve a https://status.supabase.com

2. **Revisa los logs completos de Vercel**:
   - Deployments → Tu deploy → View Logs
   - Busca "error" o "undefined"

3. **Prueba con valores hardcodeados** (temporal):
   ```javascript
   // Temporal para debug
   const supabaseUrl = 'https://isgzovddlwckdqjwntjo.supabase.co'
   const supabaseAnonKey = 'eyJhbGc...'
   ```
   - Si funciona así, el problema es con las variables
   - Si no funciona, el problema es otro

4. **Contacta soporte de Vercel**:
   - https://vercel.com/help
   - Sube logs completos

---

## 📝 Archivos Relacionados

- `vite.config.js` - Configuración mejorada ✅
- `.env.example` - Template de variables
- `.env.production.example` - Template para producción
- `VERCEL_DEPLOYMENT_GUIDE.md` - Guía general de deploy

