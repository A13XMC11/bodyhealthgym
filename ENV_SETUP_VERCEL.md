# Configuración Correcta de Variables de Entorno en Vercel

## 🎯 Cómo Funcionan las Variables en Vercel vs Local

### En tu computadora (Local)
```
.env (en tu máquina)
     ↓
npm run dev
     ↓
Vite lee .env
     ↓
import.meta.env.VITE_SUPABASE_URL ✅ FUNCIONA
```

### En Vercel (Producción)
```
Vercel Dashboard Environment Variables
     ↓
npm run build (en servidor de Vercel)
     ↓
Vite lee variables del sistema
     ↓
import.meta.env.VITE_SUPABASE_URL ✅ DEBE FUNCIONAR
```

---

## 📋 Paso a Paso: Configurar Variables en Vercel

### Paso 1: Ir al Dashboard de Vercel

1. Ve a https://vercel.com
2. Selecciona tu proyecto: **bodyhealtgym**
3. Haz clic en **Settings**

### Paso 2: Environment Variables

Haz clic en **Environment Variables** (en el menú izquierdo)

### Paso 3: Agregar Primera Variable

**Nombre**: `VITE_SUPABASE_URL`
**Valor**: `https://isgzovddlwckdqjwntjo.supabase.co`

**Selecciona todos estos:**
- ☑️ Preview
- ☑️ Development
- ☑️ Production

**Haz clic en "Save"**

### Paso 4: Agregar Segunda Variable

**Nombre**: `VITE_SUPABASE_ANON_KEY`
**Valor**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzZ3pvdmRkbHdja2RxandudGpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MjM2MTEsImV4cCI6MjA5MDE5OTYxMX0.maj47MFHTal7Flts3jUnqVNhuEQEGkBPy2oWuUmgx_Y`

**Selecciona todos estos:**
- ☑️ Preview
- ☑️ Development
- ☑️ Production

**Haz clic en "Save"**

### Paso 5: Redeploy

Después de agregar variables, **DEBES redeployar**:

1. Ve a **Deployments**
2. Haz clic en el último deploy (debe tener estado "ready")
3. Haz clic en los **3 puntitos** (⋮)
4. Selecciona **Redeploy**
5. Selecciona **Use Existing Commit**
6. Espera a que se complete

---

## ✅ Verificación: ¿Está Funcionando?

### Opción 1: Probar en Navegador

1. Ve a https://bodyhealtgym.vercel.app
2. Abre DevTools (F12)
3. Ve a **Console**
4. Copia y ejecuta esto:

```javascript
// Debería mostrar la URL de Supabase
console.log(import.meta.env.VITE_SUPABASE_URL)
```

**Si ves**: `https://isgzovddlwckdqjwntjo.supabase.co` ✅ **¡FUNCIONA!**

**Si ves**: `undefined` ❌ **No funciona, sigue el troubleshooting**

### Opción 2: Probar Login

1. Ve a https://bodyhealtgym.vercel.app
2. Intenta hacer login con:
   - Email: `admin@demo.com`
   - Password: `demo1234`
3. Si funciona, las variables están OK ✅

### Opción 3: Revisar Logs de Vercel

1. Ve a **Deployments** en Vercel
2. Haz clic en el deploy actual
3. Haz clic en **Logs**
4. Busca `VITE_` o `error`

---

## 🔄 Ciclo de Actualización de Variables

Si cambias una variable:

```
Cambias en Vercel Dashboard
         ↓
Haces clic "Save"
         ↓
Necesitas REDEPLOY (importante)
         ↓
Vercel reconstruye con nuevas variables
         ↓
Espera 2-3 minutos
         ↓
La app debería tener nuevas variables ✅
```

**⚠️ IMPORTANTE**: Solo hacer commit no es suficiente. Debes **redeploy**.

---

## 🐛 Errores Comunes

### Error 1: "Cannot read property 'co' of undefined"
```
Significa: VITE_SUPABASE_URL es undefined
Solución: Revisa que esté en Environment Variables de Vercel
```

### Error 2: "Unauthorized"
```
Significa: VITE_SUPABASE_ANON_KEY es inválido
Solución: Verifica que la clave sea exactamente igual a la de Supabase
```

### Error 3: "CORS error"
```
Significa: Supabase está bloqueando la petición
Solución: Verifica configuración CORS en Supabase dashboard
```

---

## 📝 Comparativa: Local vs Vercel

| Aspecto | Local | Vercel |
|--------|-------|--------|
| **Dónde se leen** | `.env` en tu máquina | Dashboard → Environment Variables |
| **Cuándo se leen** | Cuando ejecutas `npm run dev` | Cuando Vercel hace `build` |
| **Comando** | `npm run dev` | Automático en cada push |
| **Archivo `.env`** | Obligatorio | No sube a Vercel (en .gitignore) |
| **Actualizar** | Editas `.env` y recargas | Editas dashboard y redeployas |

---

## 💡 Mejores Prácticas

✅ **Hazlo así:**
- Define variables en Vercel Dashboard (no en código)
- Usa `.env.example` como referencia
- Redeploy después de cambiar variables
- Nunca commits `.env` a Git

❌ **No lo hagas:**
- Hardcodear credenciales en código
- Confiar en que `npm run dev` funcionará en prod
- Olvidar de redeploy después de cambiar variables
- Usar nombres diferentes en local vs Vercel

---

## 🎯 Resumen Rápido

| Paso | Acción | Verificación |
|------|--------|-------------|
| 1 | Ir a Vercel Settings → Environment Variables | ✅ |
| 2 | Agregar `VITE_SUPABASE_URL` | ✅ |
| 3 | Agregar `VITE_SUPABASE_ANON_KEY` | ✅ |
| 4 | Redeploy desde Deployments | ✅ |
| 5 | Esperar 2-3 minutos | ⏳ |
| 6 | Probar en https://bodyhealtgym.vercel.app | ✅ |
| 7 | Abrir console (F12) y verificar variables | ✅ |

