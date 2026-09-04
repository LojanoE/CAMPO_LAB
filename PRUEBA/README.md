# ⚖️ Balanza Jontex BLE Reader

App web + script Python para conectar y leer datos de la balanza de piso inalámbrica Jontex (módulo BR2262e) vía Bluetooth Low Energy.

## 🔧 Arquitectura detectada

La balanza usa un **módulo BR2262e** de Barrot Technology, que funciona como un **puente BLE-UART**:

- **Service UUID:** `0xFF00`
- **RX (Notify):** `0xFF01` ← Recibes datos de la balanza aquí
- **TX (Write):** `0xFF02` → Envías comandos a la balanza aquí

El microcontrolador de la balanza envía el peso por UART al módulo BLE, y este lo retransmite como notificaciones BLE.

## 🚀 Uso rápido

### Opción A: App Web (navegador)

1. Abre `balanza_ble_app.html` en **Chrome, Edge o Opera** (Web Bluetooth API).
2. Enciende la balanza cerca de tu dispositivo.
3. Presiona **"Escanear y Conectar"** y selecciona el dispositivo `BR2262e`.
4. Coloca un peso y observa los datos en tiempo real.

> ⚠️ **Nota:** En iOS, Safari no soporta Web Bluetooth. Usa una app como [Bluefy](https://apps.apple.com/us/app/id1492822055) o el script Python.

### Opción B: Script Python

```bash
pip install bleak
python ble_scale_sniffer.py
```

El script escanea, conecta, lista servicios/characteristics y muestra en consola:
- Bytes en hexadecimal
- Bytes interpretados como ASCII
- Bytes como lista de enteros

## 🔍 Reverse Engineering del Protocolo

La app incluye un parser básico, pero cada balanza china usa un protocolo ligeramente diferente. Para descifrarlo:

1. **Pon 0 kg** en la balanza → anota los bytes recibidos.
2. **Pon un peso conocido** (ej: 10.00 kg) → anota los bytes.
3. **Compara** las tramas. Busca patrones:
   - ¿Es ASCII legible? (ej: `"  10.00"`)
   - ¿Es BCD? (cada dígito en un nibble)
   - ¿Es un entero de 16/32 bits con punto decimal fijo?
   - ¿Hay bytes de header/checksum al inicio/final?

Una vez identificado el formato, actualiza la función `parseWeight()` en `balanza_ble_app.html` o en tu backend.

## 📁 Estructura

```
├── balanza_ble_app.html      # App web (Web Bluetooth API)
├── ble_scale_sniffer.py      # Script Python de prueba (bleak)
└── README.md                 # Este archivo
```

## 📋 Requisitos

- **App Web:** Navegador con soporte Web Bluetooth (Chrome 70+, Edge 79+, Opera 56+)
- **Python:** Python 3.8+, `bleak`
- **Hardware:** Balanza Jontex con módulo BR2262e encendida y dentro del alcance BLE

## 📝 Licencia

MIT - Libre para uso académico y comercial.
