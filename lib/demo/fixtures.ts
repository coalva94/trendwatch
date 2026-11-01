import type {
  Item,
  ItemStatus,
  Relevance,
  SectorFile,
  Source,
  SyncRun,
  Topic,
  WeeklyReport,
  Workspace,
} from "@/lib/types";

type Seed = {
  id: string;
  source: string;
  topic: string;
  title: string;
  summary: string;
  daysAgo: number;
  hoursAgo: number;
  relevance: Relevance;
  reason: string;
  status: ItemStatus;
  cluster?: string;
};

const SEEDS: Seed[] = [
  {
    id: "item-wind-1",
    source: "google-news-wind",
    topic: "wind",
    title: "Spain awards 3.5 GW in its latest onshore wind auction",
    summary: "Una subasta terrestre en España adjudica 3,5 GW con condiciones de cadena local.",
    daysAgo: 0,
    hoursAgo: 3,
    relevance: 3,
    reason: "Subasta eólica de gran tamaño. Encaja con Eólica y es una señal de mercado prioritaria.",
    status: "pending",
    cluster: "wind-auction",
  },
  {
    id: "item-wind-2",
    source: "pv-magazine",
    topic: "wind",
    title: "Spanish wind auction clears 3.5 GW with tighter local-content rules",
    summary: "El mismo concurso, contado desde las reglas de contenido local.",
    daysAgo: 0,
    hoursAgo: 5,
    relevance: 3,
    reason: "Misma subasta de 3,5 GW. Prioritaria para Eólica por el cambio de reglas.",
    status: "interesting",
    cluster: "wind-auction",
  },
  {
    id: "item-wind-3",
    source: "renewable-energy-world",
    topic: "wind",
    title: "Iberian grid expects 3.5 GW from the new Spanish wind auction",
    summary: "La red ibérica anticipa la entrada de la capacidad adjudicada.",
    daysAgo: 1,
    hoursAgo: 2,
    relevance: 2,
    reason: "Repite la subasta española y añade el efecto en la red. Relevante para Eólica.",
    status: "pending",
    cluster: "wind-auction",
  },
  {
    id: "item-batt-1",
    source: "canary-media",
    topic: "storage",
    title: "Battery pack prices fall again as LFP capacity expands",
    summary: "El precio del pack sigue bajando con más capacidad LFP.",
    daysAgo: 1,
    hoursAgo: 1,
    relevance: 3,
    reason: "Caída de precios LFP. Prioritaria para Almacenamiento e hidrógeno.",
    status: "follow",
    cluster: "battery-prices",
  },
  {
    id: "item-batt-2",
    source: "cleantechnica",
    topic: "storage",
    title: "LFP oversupply pushes utility-scale battery prices lower",
    summary: "El exceso de oferta LFP presiona el almacenamiento a escala de red.",
    daysAgo: 1,
    hoursAgo: 6,
    relevance: 2,
    reason: "Misma tendencia de precios de baterías, enfocada en utility-scale.",
    status: "pending",
    cluster: "battery-prices",
  },
  {
    id: "item-curt-1",
    source: "google-news-solar",
    topic: "grids",
    title: "Grid operators warn of spring solar curtailment in southern Europe",
    summary: "Los operadores avisan de vertidos solares en primavera.",
    daysAgo: 2,
    hoursAgo: 2,
    relevance: 3,
    reason: "Curtailment solar en el sur de Europa. Prioritaria para Redes y demanda.",
    status: "pending",
    cluster: "curtailment",
  },
  {
    id: "item-curt-2",
    source: "pv-magazine",
    topic: "grids",
    title: "Spring solar peaks force more curtailment on southern European grids",
    summary: "Los picos de primavera aumentan los vertidos en redes del sur.",
    daysAgo: 2,
    hoursAgo: 4,
    relevance: 2,
    reason: "Misma alerta de curtailment, con foco en la operación de la red.",
    status: "interesting",
    cluster: "curtailment",
  },
  {
    id: "item-sea-1",
    source: "google-news-wind",
    topic: "wind",
    title: "North Sea offshore lease round draws mixed bids",
    summary: "La ronda de arrendamiento offshore del Mar del Norte recibe pujas desiguales.",
    daysAgo: 3,
    hoursAgo: 2,
    relevance: 2,
    reason: "Ronda offshore con resultado mixto. Relevante para Eólica.",
    status: "pending",
    cluster: "north-sea",
  },
  {
    id: "item-sea-2",
    source: "canary-media",
    topic: "wind",
    title: "Offshore wind leasing in the North Sea sees cautious bidding",
    summary: "Las ofertas de la misma ronda se describen como cautelosas.",
    daysAgo: 3,
    hoursAgo: 5,
    relevance: 2,
    reason: "Misma ronda del Mar del Norte. Conviene seguir el cierre de las ofertas.",
    status: "follow",
    cluster: "north-sea",
  },
  {
    id: "item-h2",
    source: "cleantechnica",
    topic: "storage",
    title: "Green hydrogen offtake slows as electrolyser costs stay high",
    summary: "Los contratos de hidrógeno verde se frenan por el coste del electrolizador.",
    daysAgo: 2,
    hoursAgo: 8,
    relevance: 2,
    reason: "Señal de demanda débil en hidrógeno. Relevante para Almacenamiento e hidrógeno.",
    status: "pending",
  },
  {
    id: "item-eu",
    source: "google-news-policy",
    topic: "policy",
    title: "EU ministers debate a softer renewable target timeline",
    summary: "Los ministros discuten alargar el calendario de objetivos renovables.",
    daysAgo: 3,
    hoursAgo: 1,
    relevance: 2,
    reason: "Cambio posible de calendario regulatorio. Relevante para Política y subastas.",
    status: "pending",
  },
  {
    id: "item-plant",
    source: "google-news-solar",
    topic: "solar",
    title: "Module manufacturer announces a 5 GW cell plant in the United States",
    summary: "Un fabricante anuncia 5 GW de células en Estados Unidos.",
    daysAgo: 4,
    hoursAgo: 2,
    relevance: 3,
    reason: "Nueva capacidad industrial de 5 GW. Prioritaria para Solar fotovoltaica.",
    status: "interesting",
  },
  {
    id: "item-ppa",
    source: "google-news-policy",
    topic: "policy",
    title: "Corporate PPA market cools as wholesale power prices ease",
    summary: "Los PPA corporativos se enfrían cuando baja el precio mayorista.",
    daysAgo: 4,
    hoursAgo: 6,
    relevance: 2,
    reason: "El mercado de PPA cambia de ritmo. Conviene seguirlo en Política y subastas.",
    status: "follow",
  },
  {
    id: "item-line",
    source: "canary-media",
    topic: "grids",
    title: "Transmission delay pushes back a 1.2 GW solar cluster in Nevada",
    summary: "Un retraso de transmisión aplaza 1,2 GW solares en Nevada.",
    daysAgo: 1,
    hoursAgo: 8,
    relevance: 3,
    reason: "Cuello de botella de red sobre un clúster solar concreto. Prioritaria.",
    status: "pending",
  },
  {
    id: "item-float",
    source: "pv-magazine",
    topic: "wind",
    title: "Floating wind prototype completes a 30-day North Atlantic trial",
    summary: "Un prototipo flotante termina 30 días de ensayo en el Atlántico norte.",
    daysAgo: 5,
    hoursAgo: 3,
    relevance: 2,
    reason: "Hito técnico de eólica flotante. Relevante, todavía sin decisión de escala.",
    status: "pending",
  },
  {
    id: "item-glass",
    source: "google-news-storage",
    topic: "storage",
    title: "Recycling startups pitch closed-loop recovery for solar glass",
    summary: "Startups proponen recuperar vidrio solar en ciclo cerrado.",
    daysAgo: 4,
    hoursAgo: 4,
    relevance: 1,
    reason: "Mención tangencial al ciclo de vida solar, sin cifra de mercado.",
    status: "pending",
  },
  {
    id: "item-club",
    source: "cleantechnica",
    topic: "solar",
    title: "Local football club adds a small rooftop array above the stands",
    summary: "Un club instala un campo solar pequeño sobre la grada.",
    daysAgo: 5,
    hoursAgo: 1,
    relevance: 0,
    reason: "Instalación anecdótica, sin efecto en el mercado del sector.",
    status: "discarded",
  },
  {
    id: "item-copper",
    source: "google-news-wind",
    topic: "wind",
    title: "Analysts say copper prices could lift turbine bill of materials",
    summary: "El cobre podría encarecer la lista de materiales de las turbinas.",
    daysAgo: 5,
    hoursAgo: 7,
    relevance: 1,
    reason: "Coste indirecto para turbinas. Tangencial hasta que haya cifras de proyecto.",
    status: "pending",
  },
  {
    id: "item-garden",
    source: "google-news-solar",
    topic: "solar",
    title: "Community fund buys a stake in a municipal solar garden",
    summary: "Un fondo vecinal compra una parte de un huerto solar municipal.",
    daysAgo: 6,
    hoursAgo: 2,
    relevance: 1,
    reason: "Proyecto local de pequeña escala. Tangencial para el seguimiento del sector.",
    status: "discarded",
  },
  {
    id: "item-port",
    source: "canary-media",
    topic: "wind",
    title: "Port upgrades are scheduled ahead of a turbine installation campaign",
    summary: "Un puerto programa mejoras antes de una campaña de instalación.",
    daysAgo: 2,
    hoursAgo: 6,
    relevance: 2,
    reason: "Evento logístico fechado. Conviene seguirlo por la campaña de turbinas.",
    status: "follow",
  },
  {
    id: "item-pipe",
    source: "google-news-policy",
    topic: "storage",
    title: "Hydrogen pipeline corridor enters public consultation this month",
    summary: "Un corredor de hidrógeno abre consulta pública este mes.",
    daysAgo: 3,
    hoursAgo: 8,
    relevance: 2,
    reason: "Plazo regulatorio cercano. Relevante para Almacenamiento e hidrógeno.",
    status: "pending",
  },
];

function hoursAgo(now: Date, daysAgo: number, extraHours: number): string {
  return new Date(now.getTime() - (daysAgo * 24 + extraHours) * 60 * 60 * 1000).toISOString();
}

function topicId(sectorSlug: string, topicSlug: string): string {
  return `${sectorSlug}:${topicSlug}`;
}

function sourceId(sectorSlug: string, sourceSlug: string): string {
  return `${sectorSlug}:${sourceSlug}`;
}

export function idsFor(sector: SectorFile): { topicId: (slug: string) => string; sourceId: (slug: string) => string } {
  return {
    topicId: (slug) => topicId(sector.slug, slug),
    sourceId: (slug) => sourceId(sector.slug, slug),
  };
}

function mapTopics(sector: SectorFile): Topic[] {
  return sector.topics.map((topic) => ({
    id: topicId(sector.slug, topic.slug),
    sectorId: sector.slug,
    slug: topic.slug,
    name: topic.name,
    description: topic.description,
    keywords: topic.keywords,
    active: true,
  }));
}

function mapSources(sector: SectorFile, now: Date): Source[] {
  return sector.sources.map((source) => {
    const failed = sector.slug === "renewable-energy" && source.slug === "renewable-energy-world";
    return {
      id: sourceId(sector.slug, source.slug),
      sectorId: sector.slug,
      slug: source.slug,
      name: source.name,
      url: source.url,
      kind: source.kind,
      active: true,
      lastFetchedAt: failed ? hoursAgo(now, 2, 1) : hoursAgo(now, 0, 3),
      lastError: failed ? "Tiempo de espera agotado al leer el feed" : null,
      lastStatus: failed ? "error" : "ok",
    };
  });
}

function searchUrl(title: string): string {
  return `https://news.google.com/search?q=${encodeURIComponent(title)}&hl=en-US&gl=US&ceid=US:en`;
}

export function buildDemoWorkspace(sector: SectorFile, now: Date): Workspace {
  const topics = mapTopics(sector);
  const sources = mapSources(sector, now);
  if (sector.slug !== "renewable-energy") {
    return {
      demoMode: true,
      sector: {
        id: sector.slug,
        slug: sector.slug,
        name: sector.name,
        description: sector.description,
        active: true,
      },
      topics,
      sources,
      items: [],
      sync: null,
      report: null,
    };
  }

  const sourceBySlug = new Map(sources.map((source) => [source.slug, source]));
  const topicBySlug = new Map(topics.map((topic) => [topic.slug, topic]));
  const items: Item[] = SEEDS.map((seed) => {
    const source = sourceBySlug.get(seed.source);
    const topic = topicBySlug.get(seed.topic);
    if (!source || !topic) {
      throw new Error(`El ejemplo demo cita un slug que no está en el sector: ${seed.source}/${seed.topic}`);
    }
    return {
      id: seed.id,
      sectorId: sector.slug,
      sourceId: source.id,
      externalId: seed.id,
      title: seed.title,
      url: searchUrl(seed.title),
      summary: seed.summary,
      publishedAt: hoursAgo(now, seed.daysAgo, seed.hoursAgo),
      relevance: seed.relevance,
      relevanceReason: seed.reason,
      topicId: topic.id,
      clusterId: seed.cluster ? `cluster-${seed.cluster}` : null,
      status: seed.status,
    };
  });

  const sync: SyncRun = {
    id: "sync-demo",
    sectorId: sector.slug,
    kind: "ingest",
    startedAt: hoursAgo(now, 0, 3.2),
    finishedAt: hoursAgo(now, 0, 3),
    status: "ok",
    itemsRead: 96,
    itemsNew: items.length,
    itemsClassified: items.length,
    message: "8 fuentes en el sector. Renewable Energy World: tiempo de espera agotado.",
  };

  const end = now.toISOString().slice(0, 10);
  const start = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const report: WeeklyReport = {
    id: "report-demo",
    sectorId: sector.slug,
    weekStart: start,
    weekEnd: end,
    title: "Señales de los últimos 7 días",
    trends: [
      "La subasta eólica española de 3,5 GW se repite en varios medios, con reglas de contenido local más estrictas.",
      "El precio de las baterías LFP sigue bajando y empuja el almacenamiento a escala de red.",
      "El curtailment solar de primavera en el sur de Europa aparece como aviso de operación, no como anécdota.",
    ],
    opportunities: [
      "Un anuncio de 5 GW de células en Estados Unidos abre seguimiento de cadena de suministro.",
      "Los PPA corporativos se enfrían: puede haber ventana para compradores pacientes.",
      "La consulta de un corredor de hidrógeno abre un plazo de alegaciones este mes.",
    ],
    alerts: [
      "Un retraso de transmisión aplaza 1,2 GW solares en Nevada.",
      "La ronda offshore del Mar del Norte cierra con pujas cautelosas.",
      "Renewable Energy World no respondió en la última lectura. El resto de fuentes sí.",
    ],
    upcomingEvents: [
      "Campaña de instalación de turbinas ligada a mejoras portuarias ya programadas.",
      "Consulta pública del corredor de hidrógeno, abierta este mes.",
      "El prototipo de eólica flotante terminó 30 días de ensayo: el siguiente hito sería la certificación.",
    ],
    narrative:
      "La semana de ejemplo se concentra en tres señales que varios medios cuentan a la vez: la subasta eólica española, el abaratamiento LFP y los vertidos solares en redes del sur de Europa. El resto son movimientos de una sola fuente. Nada de esto se ha borrado: lo descartado sigue en el feed con estado reversible. Este texto es un informe de demostración sobre titulares ficticios, no una recomendación de inversión.",
    model: "demo",
    createdAt: hoursAgo(now, 0, 20),
  };

  return {
    demoMode: true,
    sector: {
      id: sector.slug,
      slug: sector.slug,
      name: sector.name,
      description: sector.description,
      active: true,
    },
    topics,
    sources,
    items,
    sync,
    report,
  };
}
