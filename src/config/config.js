const config = {
  data: {
    // Idioma de la invitación ("es", "en" o "id")
    language: "es",
    // Título que aparece en la pestaña del navegador y al compartir el link
    title: "Boda de Laura & Alejandro",
    // Mensaje de apertura de la invitación
    description:
      "Con nuestro amor, con la bendición de Dios y presencia de nuestros padres, cordialmente te invitamos a nuestra boda.",
    // Nombre del novio
    groomName: "Alejandro",
    // Nombre de la novia
    brideName: "Laura",
    // Versículo que aparece en la portada
    verse: {
      text: "Uno solo puede ser vencido, pero dos pueden resistir. ¡La cuerda de tres hilos no se rompe fácilmente!",
      reference: "Eclesiastés 4:12",
    },
    // Fecha de la boda (formato: YYYY-MM-DD)
    date: "2026-10-17",
    // Hora principal que se muestra en la portada
    time: "3:00 PM",
    // Zona horaria del evento (para la cuenta regresiva y el calendario)
    timeZone: "America/Mexico_City",
    utcOffset: "-06:00",
    // Imagen que aparece al compartir el link en redes sociales
    ogImage: "",
    // Icono de la pestaña del navegador
    favicon: "/favicon.svg",
    // Itinerario de la boda. El mapa de cada lugar se genera con "mapsQuery";
    // si tienes el link exacto de Google Maps, pégalo en "maps_url" y "maps_embed".
    agenda: [
      {
        title: "Ceremonia",
        date: "2026-10-17",
        // Hora de inicio (formato 24 h: HH:MM)
        startTime: "15:00",
        // Hora de término (opcional)
        endTime: "",
        location: "Iglesia Jesucristo Rey de Gloria",
        address: "Calle 10 entre Calle 11 y Andador 1, Col. La Cruz.",
        // TODO: agrega la ciudad y el estado para que el mapa sea exacto
        mapsQuery: "Iglesia Jesucristo Rey de Gloria, Col. La Cruz",
        maps_url: "",
        maps_embed: "",
      },
      {
        title: "Recepción",
        date: "2026-10-17",
        startTime: "17:00",
        endTime: "",
        location: "Salón Lua Eventos",
        address:
          "Carr. Costera de Golfo entre Calle 1 y Calle 3, Col. Las Brisas.",
        // TODO: agrega la ciudad y el estado para que el mapa sea exacto
        mapsQuery: "Salón Lua Eventos, Col. Las Brisas",
        maps_url: "",
        maps_embed: "",
      },
    ],

    // Música de fondo
    audio: {
      src: "/audio/fulfilling-humming.mp3", // o /audio/nature-sound.mp3
      title: "Fulfilling Humming",
      autoplay: true,
      loop: true,
    },
  },
};

export default config;
