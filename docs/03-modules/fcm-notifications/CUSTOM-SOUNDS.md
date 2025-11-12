# Sonidos Personalizados para Notificaciones FCM

## 📊 Estado Actual

**Implementado**: ✅ Sonidos del sistema operativo + Patrones de vibración diferenciados
**Pendiente**: 🔜 Archivos de audio personalizados (opcional)

---

## 🔊 Configuración Actual

### **Background Notifications (App cerrada/minimizada)**

El Service Worker reproduce el **sonido por defecto del sistema operativo** con estos ajustes:

```javascript
silent: false  // Habilita sonido del sistema
```

### **Patrones de Vibración Diferenciados** (Android)

| Tipo de Notificación | Patrón de Vibración | Descripción |
|----------------------|---------------------|-------------|
| `admin.new_order` | `[200, 100, 200, 100, 200]` | Fuerte y repetitivo - Nuevo pedido |
| `admin.*` (otros) | `[100, 50, 100, 50, 100, 50, 100]` | Alerta rápida - Eventos admin |
| `order.delivered` | `[100, 50, 100]` | Suave - Entrega completada |
| `order.cancelled` | `[300, 100, 300]` | Alerta - Cancelación |
| Otros | `[200, 100, 200]` | Genérico |

### **Foreground Notifications (App abierta)**

Cuando la app está abierta, se reproducen sonidos sintéticos con Web Audio API:

- **`admin.new_order`**: Sonido de caja registradora (cha-ching)
- **`order.delivered`**: Campana suave
- **Alertas**: Dos beeps rápidos
- **Otros**: Beep genérico suave

Código en: `src/lib/fcm/notification-handlers.ts`

---

## 🎵 Agregar Archivos de Audio Personalizados (Opcional)

Si quieres usar **archivos de audio reales** en lugar del sonido del sistema:

### **Paso 1: Generar los archivos de audio**

1. **Abre el generador**:
   ```
   http://localhost:9002/sounds/generate-sounds.html
   ```

2. **Descarga los sonidos generados**:
   - `cash-register.wav` - Caja registradora para admins
   - `gentle-notification.wav` - Suave para clientes
   - `alert.wav` - Alerta para problemas

3. **Convierte WAV a MP3** (mejor compatibilidad):
   - Usa https://cloudconvert.com/wav-to-mp3
   - O cualquier conversor de audio

### **Paso 2: Colocar archivos en `public/sounds/`**

```
public/sounds/
├── cash-register.mp3
├── gentle-notification.mp3
├── alert.mp3
└── README.md
```

### **Paso 3: Actualizar Service Worker**

**⚠️ IMPORTANTE**: Los Service Workers **NO pueden reproducir archivos de audio directamente**.

Las opciones son:

#### **Opción A: Usar Data URLs** (Archivos pequeños < 10KB)

Convertir el MP3 a Base64 y embeber en el código:

```javascript
// En firebase-messaging-sw.js
const SOUNDS = {
  cashRegister: 'data:audio/mp3;base64,//uQx...[base64]',
  gentle: 'data:audio/mp3;base64,//uQx...[base64]',
  alert: 'data:audio/mp3;base64,//uQx...[base64]'
};

// Usar en notificationOptions:
notificationOptions.sound = SOUNDS.cashRegister;
```

**Limitación**: Los navegadores modernos **ignoran el parámetro `sound`** en notificaciones web por razones de seguridad.

#### **Opción B: Reproducir en Foreground** (Recomendado)

Mantener la configuración actual:
- **Background**: Sonido del sistema (funciona siempre)
- **Foreground**: Web Audio API personalizado (ya implementado)

Esta es la solución más confiable y compatible.

---

## 🧪 Testing

### **Probar Sonidos en Background**

1. Abre la app en producción
2. **Minimiza la ventana** o **cambia a otra pestaña**
3. Haz un pedido de prueba
4. Deberías escuchar el **sonido por defecto del sistema**

### **Probar Sonidos en Foreground**

1. Abre la app
2. **Mantén la pestaña activa**
3. Haz un pedido de prueba
4. Deberías escuchar el **sonido de caja registradora** (Web Audio API)

---

## 🎯 Recomendación Final

**Configuración actual es óptima**:
- ✅ Compatible con todos los navegadores
- ✅ No requiere archivos adicionales
- ✅ Sonidos diferenciados entre foreground y background
- ✅ Patrones de vibración para Android

**Solo agregar archivos de audio si**:
- Necesitas branding específico (jingle de la marca)
- Quieres sonidos ultra-distintivos
- Estás dispuesto a mantener la compatibilidad

---

## 📚 Referencias

- [Notification API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Notification)
- [Vibration API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Service Worker Notifications](https://web.dev/push-notifications-overview/)
