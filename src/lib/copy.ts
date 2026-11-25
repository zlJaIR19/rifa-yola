// All user-facing text (Spanish, Peru). Keep every UI string here.
// Rule: no em dashes in UI text.
import { raffleConfig, TOTAL_NUMBERS } from "./raffle-config";

export const copy = {
  meta: {
    title: "Rifa Navideña | Yoli Manualidades",
    description: "Control de números vendidos de la Rifa Navideña de Yoli Manualidades",
  },

  brand: {
    organizer: raffleConfig.organizer,
    raffleName: raffleConfig.raffleName,
  },

  nav: {
    board: "Tablero",
    summary: "Resumen",
    history: "Historial",
    notice: "Avisar sorteo",
    logout: "Salir",
  },

  login: {
    title: "Ingresa para vender",
    username: "Usuario",
    usernamePlaceholder: "Escribe el usuario",
    pin: "PIN",
    pinPlaceholder: "4 dígitos",
    submit: "Entrar",
    submitting: "Entrando...",
    errorInvalid: "Usuario o PIN incorrecto.",
    errorPinFormat: "El PIN debe tener 4 dígitos.",
    errorMissing: "Completa el usuario y el PIN.",
    errorRateLimited: "Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.",
    errorServer: "No se pudo iniciar sesión. Inténtalo de nuevo.",
  },

  board: {
    sold: (sold: number, total: number) => `Vendidos: ${sold}/${total}`,
    free: (free: number) => `Libres: ${free}`,
    filterAll: "Todos",
    filterFree: "Libres",
    filterSold: "Vendidos",
    searchPlaceholder: "Buscar número",
    searchLabel: "Ir al número",
    searchNotFound: `Ese número no existe (1 a ${TOTAL_NUMBERS}).`,
    emptyFilter: "No hay números en este filtro.",
    loading: "Cargando números...",
    loadError: "No se pudieron cargar los números. Revisa tu conexión.",
    live: "En vivo",
    reconnecting: "Reconectando...",
    legendFree: "Libre",
    legendSold: "Vendido",
    numberAria: (n: string, soldBy: string | null) =>
      soldBy ? `Número ${n}, vendido por ${soldBy}` : `Número ${n}, libre`,
  },

  sale: {
    titleFree: (n: string) => `Número ${n}`,
    freeBadge: "Libre",
    soldBadge: "Vendido",
    sellerLabel: "Vendedor(a)",
    sellerPlaceholder: "Tu nombre",
    sellerHint: "Elige tu nombre de la lista si ya aparece.",
    buyerLabel: "Nombre del comprador",
    buyerPlaceholder: "Nombre y apellido",
    phoneLabel: "Celular del comprador",
    phonePlaceholder: "Ej. 955 838 525",
    confirm: "Confirmar venta",
    confirming: "Guardando...",
    cancel: "Cancelar",
    close: "Cerrar",
    success: (n: string) => `¡Número ${n} vendido!`,
    successHint: "Ahora envíale su ticket al comprador.",
    buyer: "Comprador",
    phone: "Celular",
    seller: "Vendedor",
    date: "Fecha de venta",
    openChat: "1. Abrir chat",
    shareTicket: "2. Compartir ticket",
    preparingTicket: "Preparando ticket...",
    ticketDownloaded: "Ticket descargado. Envíalo por WhatsApp.",
    ticketError: "No se pudo generar el ticket. Inténtalo de nuevo.",
    helper:
      "Primero abre el chat y luego comparte el ticket. El comprador aparecerá entre tus chats recientes.",
    edit: "Editar datos",
    editTitle: (n: string) => `Editar número ${n}`,
    saveEdit: "Guardar cambios",
    saving: "Guardando...",
    editSaved: "Datos actualizados.",
    editNoChanges: "No hubo cambios.",
    release: "Liberar número",
    releaseTitle: (n: string) => `¿Liberar el número ${n}?`,
    releaseBody:
      "Se borrarán los datos del comprador y el número quedará libre para otra venta. Esta acción queda registrada en el Historial.",
    releaseConfirm: "Sí, liberar",
    releasing: "Liberando...",
    released: (n: string) => `Número ${n} liberado.`,
    loadingDetail: "Cargando datos...",
    detailError: "No se pudieron cargar los datos del número.",
  },

  errors: {
    alreadySold: (seller: string) => `Este número ya fue vendido por ${seller}.`,
    alreadySoldUnknown: "Este número ya fue vendido.",
    notSold: "Este número ya está libre. Actualiza el tablero.",
    changed: "Este número cambió mientras lo revisabas. Vuelve a abrirlo.",
    invalidNumber: "Número no válido.",
    sellerRequired: "Escribe el nombre del vendedor.",
    sellerLength: "El nombre del vendedor debe tener entre 2 y 40 caracteres.",
    buyerRequired: "Escribe el nombre del comprador.",
    buyerLength: "El nombre del comprador debe tener entre 2 y 80 caracteres.",
    phoneRequired: "Escribe el celular del comprador.",
    phoneInvalid: "El celular no es válido para el país elegido.",
    urlInvalid: "Escribe un link válido que empiece con https://",
    unauthorized: "Tu sesión terminó. Vuelve a ingresar.",
    network: "Sin conexión. Revisa tu internet e inténtalo de nuevo.",
    generic: "Ocurrió un error. Inténtalo de nuevo.",
  },

  phone: {
    countryLabel: "País",
    searchCountry: "Buscar país",
    noCountries: "No se encontró ese país.",
    otherCountries: "Otros países",
    detected: (country: string) => `País detectado: ${country}`,
  },

  combobox: {
    suggestions: "Vendedores registrados",
    useNew: (name: string) => `Usar "${name}" (nuevo)`,
  },

  summary: {
    title: "Resumen",
    totals: (sold: number, total: number) => `${sold} de ${total} números vendidos`,
    bySeller: "Ventas por vendedor",
    numbersCount: (n: number) => (n === 1 ? "1 número" : `${n} números`),
    noSales: "Todavía no hay ventas.",
    allSales: "Todas las ventas",
    sortBy: "Ordenar por",
    sortNumber: "Número",
    sortSeller: "Vendedor",
    colNumber: "N°",
    colSeller: "Vendedor",
    colBuyer: "Comprador",
    colPhone: "Celular",
    colDate: "Fecha",
    exportCsv: "Exportar CSV",
  },

  csv: {
    headers: ["Número", "Estado", "Vendedor", "Comprador", "Celular", "Fecha"],
    statusFree: "Libre",
    statusSold: "Vendido",
    fileName: "rifa-navidena.csv",
  },

  history: {
    title: "Historial",
    subtitle: "Registro de ventas, cambios y liberaciones. Solo lectura.",
    empty: "Todavía no hay movimientos.",
    actions: {
      sell: "Venta",
      edit: "Edición",
      release: "Liberación",
      draw_link: "Link del sorteo",
    } as Record<string, string>,
    number: (n: string) => `N° ${n}`,
    by: (seller: string) => `Vendedor: ${seller}`,
    before: "Antes",
    after: "Después",
    fields: {
      seller_name: "Vendedor",
      buyer_name: "Comprador",
      phone: "Celular",
      sold_at: "Fecha de venta",
      draw_link: "Link",
    } as Record<string, string>,
    showingLast: (n: number) => `Mostrando los últimos ${n} movimientos.`,
  },

  notice: {
    title: "Avisar sorteo",
    linkLabel: "Link de la transmisión",
    linkPlaceholder: "https://www.facebook.com/...",
    save: "Guardar",
    saving: "Guardando...",
    saved: "Link guardado para todos.",
    lastSaved: (date: string) => `Guardado por última vez: ${date}`,
    notSavedYet: "Todavía no se ha guardado un link.",
    needLink: "Primero guarda el link de la transmisión",
    filterSeller: "Filtrar por vendedor",
    allSellers: "Todos los vendedores",
    progress: (sent: number, total: number) => `Avisados: ${sent} de ${total}`,
    send: "Enviar aviso",
    sent: "Enviado ✓",
    resetMarks: "Reiniciar marcas",
    resetConfirm: "¿Quitar todas las marcas de enviado en este celular?",
    empty: "No hay compradores para este filtro.",
    numbersLabel: (count: number) => (count === 1 ? "Número" : "Números"),
  },

  notFound: {
    title: "Página no encontrada",
    back: "Volver al tablero",
  },

  errorPage: {
    title: "Algo salió mal",
    body: "No se pudo cargar esta sección. Revisa tu conexión e inténtalo de nuevo.",
  },

  common: {
    loading: "Cargando...",
    retry: "Reintentar",
    yes: "Sí",
    no: "No",
  },

  whatsapp: {
    saleMessage: (p: { buyerName: string; number: string }) =>
      [
        `🎄 *${raffleConfig.raffleName} ${raffleConfig.organizer}*`,
        "",
        `Hola ${p.buyerName}, ¡gracias por tu compra!`,
        "",
        `*Tu número:* ${p.number}`,
        `*Sorteo:* ${raffleConfig.drawDate}, en el Facebook de ${raffleConfig.organizer}`,
        "",
        "Te envío tu ticket a continuación. ¡Mucha suerte! 🍀",
      ].join("\n"),
    drawNotice: (p: { buyerName: string; numbers: string[]; drawLink: string }) =>
      [
        `🎄 *${raffleConfig.raffleName} ${raffleConfig.organizer}*`,
        "",
        `Hola ${p.buyerName}, ¡el sorteo ya comenzó!`,
        "",
        `*${p.numbers.length === 1 ? "Tu número" : "Tus números"}:* ${joinSpanish(p.numbers)}`,
        "",
        "Míralo en vivo aquí:",
        p.drawLink,
        "",
        "¡Mucha suerte! 🍀",
      ].join("\n"),
  },

  ticket: {
    title: raffleConfig.raffleName,
    organizer: raffleConfig.organizer,
    numberLabel: "Tu número",
    buyer: "Comprador",
    phone: "Celular",
    seller: "Vendedor",
    date: "Fecha de venta",
    prizes: "Premios",
    draw: (date: string) => `Sorteo: ${date}`,
    facebook: `Facebook de ${raffleConfig.organizer}`,
    contact: (phone: string) => `WhatsApp: ${phone}`,
    goodLuck: "¡Mucha suerte!",
    notFound: "Número no vendido",
  },
};

/** ["001", "015", "120"] -> "001, 015 y 120" */
export function joinSpanish(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}
