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
    // Imagen que aparece al compartir el link en redes sociales.
    // Se genera con: node scripts/build-og-image.mjs
    ogImage: "/og-image.png",
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
        address:
          "Calle 10 entre Calle 11 y Andador 1, Col. La Cruz, Champotón, Campeche.",
        mapsQuery: "Iglesia Jesucristo Rey de Gloria, Champotón, Campeche",
        maps_url: "https://maps.app.goo.gl/94VH3YfD52P63ikk9",
        maps_embed:
          "https://maps.google.com/maps?q=19.338971,-90.7175222&z=17&output=embed",
      },
      {
        title: "Recepción",
        date: "2026-10-17",
        startTime: "17:00",
        endTime: "",
        location: "Salón Lua Eventos",
        address:
          "Carr. Costera de Golfo entre Calle 1 y Calle 3, Col. Las Brisas, Champotón, Campeche.",
        mapsQuery: "Lua Eventos, Champotón, Campeche",
        maps_url: "https://maps.app.goo.gl/BcCKJvjF53nYhv989",
        maps_embed:
          "https://maps.google.com/maps?q=19.3349904,-90.736931&z=17&output=embed",
      },
    ],

    // Música de fondo
    audio: {
      src: "/audio/la-bondad-de-dios.mp3", // o /audio/fulfilling-humming.mp3, /audio/nature-sound.mp3
      title: "La Bondad de Dios",
      autoplay: true,
      loop: true,
    },
  },
};

export default config;
