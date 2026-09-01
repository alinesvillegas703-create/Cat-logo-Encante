const BASE = "appT18SKLcRy9iNLd";

const TABLES = {
  ropa: {
    id: "tblJXe6he0gMvRlCi",
    fields: {
      name: "fldx5lUxrLmfa0vKH",
      image: "fldq9N0dPtZ8WJOFG",
      type: "fldSOXtuiAkdAuj7J",
      colors: "fldzlYCOUfUoswjC6",
      price: "fld09kVmg5MfwCNJz",
      stock: "fldMa6hmSZmVdDki2"
    }
  },
  accesorios: {
    id: "tbl3FDdm2Zq89HdRI",
    fields: {
      name: "fldqWZl5i1mz3zQVT",
      image: "fldRo5Ftf6zi9vP9A",
      type: "fldLo99ktrBNao1i6",
      price: "fldY39ALfKx13Jw4w",
      stock: "fldX17W3L3LAFY914"
    }
  }
};

async function airtableTable(env, table) {
  const wanted = Object.values(table.fields);
  let offset = "";
  const all = [];

  do {
    const url = new URL(`https://api.airtable.com/v0/${BASE}/${table.id}`);
    url.searchParams.set("pageSize", "100");
    for (const f of wanted) url.searchParams.append("fields[]", f);
    if (offset) url.searchParams.set("offset", offset);

    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${env.AIRTABLE_TOKEN}` }
    });
    if (!r.ok) throw new Error(`Airtable ${r.status}: ${await r.text()}`);

    const data = await r.json();
    all.push(...(data.records || []));
    offset = data.offset || "";
  } while (offset);

  return all.map(rec => {
    const f = rec.fields || {};
    const imageField = f[table.fields.image];
    const image = Array.isArray(imageField) && imageField.length
      ? imageField[0].url
      : "";

    const type = f[table.fields.type];
    const colors = f[table.fields.colors];

    return {
      id: rec.id,
      name: f[table.fields.name] ?? "",
      type: type?.name ?? type ?? "",
      colors: Array.isArray(colors) ? colors.map(x => x.name ?? x) : (colors ?? ""),
      price: Number(f[table.fields.price] ?? 0),
      stock: Number(f[table.fields.stock] ?? 0),
      image
    };
  });
}

export async function onRequestGet({ request, env }) {
  try {
    if (!env.AIRTABLE_TOKEN) {
      return Response.json({ error: "Falta configurar AIRTABLE_TOKEN en el servidor." }, { status: 500 });
    }

    const [ropa, accesorios] = await Promise.all([
      airtableTable(env, TABLES.ropa),
      airtableTable(env, TABLES.accesorios)
    ]);

    return Response.json(
      { ropa, accesorios, updatedAt: new Date().toISOString() },
      {
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=60",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 500 });
  }
}
