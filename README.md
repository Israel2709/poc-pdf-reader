# poc-pdf-read

App de React + Vite para subir y visualizar PDFs desde Firebase Storage.

## Requisitos

- Node.js 18+ (recomendado)
- npm

## Instalación

1. Instala dependencias:

   ```
   npm install
   ```

2. Inicia el servidor de desarrollo:

   ```
   npm run dev
   ```

3. Abre la app:
   ```
   http://localhost:5173
   ```

## Scripts

- `npm run dev`: entorno de desarrollo.
- `npm run build`: build de producción.
- `npm run preview`: previsualizar el build.

## Rutas principales

- `/pdfs`: listado de PDFs.
- `/upload`: formulario para subir PDFs.

## Especificación técnica

- Frontend: React 18 + Vite.
- Estilos: Tailwind CSS.
- Ruteo: React Router (`/pdfs`, `/upload`).
- Backend de archivos: Firebase Storage.
- Visor PDF: `react-pdf` (PDF.js) en modal interno.
- Funcionalidad clave:
  - Subida de PDFs con validación, progreso y metadatos (título/descripcion).
  - Listado de PDFs desde Storage con cards responsivas.
  - Visualización interna con navegación de páginas y pantalla completa.

## Notas de Firebase Storage (CORS)

Para que el visor cargue PDFs desde Storage, el bucket debe permitir CORS.
Ejemplo de configuración para desarrollo:

```json
[
  {
    "origin": ["http://localhost:5173"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
```

Aplicar con:

```
gsutil cors set cors.json gs://prodik-news.firebasestorage.app
```

---

Desarrollador: Israel Salinas Martínez
