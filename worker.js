const BASE = "appT18SKLcRy9iNLd";

const TABLES = {
  ropa: {
    id: "tblJXe6he0gMvRlCi"
  },
  accesorios: {
    id: "tbl3FDdm2Zq89HdRI"
  }
};


/* =========================
   AIRTABLE
========================= */

async function airtableTable(env, table) {

  const all = [];
  let offset = null;

  do {

    const url = new URL(
      `https://api.airtable.com/v0/${BASE}/${table.id}`
    );

    url.searchParams.set("pageSize", "100");

    if (offset) {
      url.searchParams.set("offset", offset);
    }

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${env.AIRTABLE_TOKEN}`
      }
    });

    if (!res.ok) {

      const text = await res.text();

      throw new Error(
        `Airtable ${res.status}: ${text}`
      );

    }

    const data = await res.json();

    all.push(...(data.records || []));

    offset = data.offset || null;

  } while (offset);

  return all;
}


/* =========================
   IMÁGENES DE AIRTABLE
========================= */

function firstAttachmentUrl(value) {

  if (
    !Array.isArray(value) ||
    !value.length
  ) {
    return "";
  }

  return value[0]?.url || "";
}


/*
  Esta ruta funciona como un pequeño
  intermediario entre Airtable y el catálogo.

  El navegador solicita:

  /api/image?url=IMAGEN_DE_AIRTABLE

  Cloudflare descarga la imagen y la
  devuelve desde el mismo dominio del catálogo.
*/

async function proxyImage(request) {

  try {

    const requestUrl =
      new URL(request.url);

    const imageUrl =
      requestUrl.searchParams.get("url");


    if (!imageUrl) {

      return new Response(
        "Falta el parámetro url.",
        {
          status: 400
        }
      );

    }


    /*
      Seguridad:
      solamente permitimos imágenes HTTPS.
    */

    let parsedUrl;

    try {

      parsedUrl =
        new URL(imageUrl);

    } catch {

      return new Response(
        "URL de imagen inválida.",
        {
          status: 400
        }
      );

    }


    if (parsedUrl.protocol !== "https:") {

      return new Response(
        "La imagen debe utilizar HTTPS.",
        {
          status: 400
        }
      );

    }


    /*
      Descargamos la imagen desde Airtable.
    */

    const imageResponse =
      await fetch(parsedUrl.toString());


    if (!imageResponse.ok) {

      return new Response(
        `No se pudo obtener la imagen (${imageResponse.status}).`,
        {
          status: imageResponse.status
        }
      );

    }


    /*
      Copiamos los headers importantes
      de la imagen original.
    */

    const headers =
      new Headers();

    const contentType =
      imageResponse.headers.get(
        "content-type"
      );

    if (contentType) {

      headers.set(
        "Content-Type",
        contentType
      );

    } else {

      headers.set(
        "Content-Type",
        "image/jpeg"
      );

    }


    /*
      Permite que el navegador pueda utilizar
      la imagen desde el catálogo.
    */

    headers.set(
      "Access-Control-Allow-Origin",
      "*"
    );

    headers.set(
      "Cache-Control",
      "public, max-age=3600"
    );


    return new Response(
      imageResponse.body,
      {
        status: 200,
        headers
      }
    );


  } catch (error) {

    console.error(
      "Error al obtener imagen:",
      error
    );

    return new Response(
      "No se pudo cargar la imagen.",
      {
        status: 500
      }
    );

  }

}


/* =========================
   PRODUCTOS
========================= */

function mapRecord(record, kind) {

  const f =
    record.fields || {};

  return {

    id: record.id,

    name:
      f["Name"] || "",

    type:
      kind === "ropa"
        ? (f["Tipo"] || "")
        : (f["Tipo de accesorio"] || ""),

    colors:
      kind === "ropa"
        ? (
            Array.isArray(f["Colores"])
              ? f["Colores"]
              : []
          )
        : [],

    price:
      Number(
        f["Precio de venta"] || 0
      ),

    stock:
      Number(
        f["Unidades disponibles"] || 0
      ),

    image:
      firstAttachmentUrl(
        f["Imagen"]
      )

  };

}


async function getProducts(env) {

  const [
    ropaRecords,
    accesoriosRecords
  ] = await Promise.all([

    airtableTable(
      env,
      TABLES.ropa
    ),

    airtableTable(
      env,
      TABLES.accesorios
    )

  ]);


  return {

    ropa:
      ropaRecords.map(
        record =>
          mapRecord(
            record,
            "ropa"
          )
      ),

    accesorios:
      accesoriosRecords.map(
        record =>
          mapRecord(
            record,
            "accesorios"
          )
      ),

    updatedAt:
      new Date().toISOString()

  };

}


/* =========================
   WORKER
========================= */

export default {

  async fetch(
    request,
    env
  ) {

    const url =
      new URL(request.url);


    /* =====================
       API DE PRODUCTOS
    ===================== */

    if (
      url.pathname ===
      "/api/products"
    ) {

      try {

        if (!env.AIRTABLE_TOKEN) {

          throw new Error(
            "Falta configurar el secreto AIRTABLE_TOKEN en Cloudflare."
          );

        }


        const products =
          await getProducts(env);


        return Response.json(
          products,
          {

            headers: {

              "Cache-Control":
                "no-store",

              "Access-Control-Allow-Origin":
                "*"

            }

          }
        );


      } catch (error) {

        console.error(error);


        return Response.json(

          {
            error:
              String(
                error?.message ||
                error
              )
          },

          {
            status: 500,

            headers: {

              "Cache-Control":
                "no-store",

              "Access-Control-Allow-Origin":
                "*"

            }

          }

        );

      }

    }


    /* =====================
       PROXY DE IMÁGENES
    ===================== */

    if (
      url.pathname ===
      "/api/image"
    ) {

      return proxyImage(request);

    }


    /* =====================
       ARCHIVOS DEL CATÁLOGO
    ===================== */

    return env.ASSETS.fetch(
      request
    );

  }

};
