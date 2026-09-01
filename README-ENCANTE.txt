ENCANTE — catálogo conectado a Airtable

1) Sube esta carpeta a Cloudflare Pages/Workers.
2) Configura una variable de entorno secreta:
   AIRTABLE_TOKEN = TU_PERSONAL_ACCESS_TOKEN_DE_AIRTABLE
3) El token debe tener acceso de lectura a la base de Encante.
4) La página consulta /api/products y obtiene Ropa + Accesorios.
5) Puedes cambiar productos, fotos, precios y stock directamente en Airtable.
   El catálogo volverá a consultar Airtable al cargar la página.

IMPORTANTE: NO pongas el token dentro de index.html. Debe quedar como secreto del servidor.
