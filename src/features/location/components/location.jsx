import { useConfig } from "@/features/invitation/hooks/use-config";
import { useTranslation } from "@/lib/i18n";
import { Clock, MapPin, CalendarCheck, ExternalLink } from "lucide-react";
import { motion } from "motion/react";
import { formatEventDate, formatTime12h } from "@/lib/format-event-date";
import {
  useMotionPreset,
  staggerContainer,
  VIEWPORT_REVEAL,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

// Use the exact Google Maps links when provided, otherwise search by venue name
const getMapLinks = (venue) => {
  const query = encodeURIComponent(
    venue.mapsQuery || `${venue.location}, ${venue.address}`,
  );
  return {
    url:
      venue.maps_url ||
      `https://www.google.com/maps/search/?api=1&query=${query}`,
    embed:
      venue.maps_embed ||
      `https://maps.google.com/maps?q=${query}&z=16&output=embed`,
  };
};

export default function Location() {
  const config = useConfig(); // Use hook to get config from API or fallback to static
  const { t } = useTranslation();
  const fadeUp = useMotionPreset("fadeUp");
  const scaleIn = useMotionPreset("scaleIn");

  return (
    <>
      {/* Location section */}
      <section
        id="location"
        className={cn("min-h-screen relative overflow-hidden")}
      >
        <div className={cn("container mx-auto px-4 py-20 relative z-10")}>
          {/* Section Header */}
          <motion.div
            variants={staggerContainer()}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT_REVEAL}
            className={cn("text-center space-y-4 mb-16")}
          >
            <motion.span
              variants={fadeUp}
              className={cn("inline-block text-rose-500 font-medium")}
            >
              {t("location.eventVenue")}
            </motion.span>

            <motion.h2
              variants={fadeUp}
              className={cn("text-4xl md:text-5xl font-serif text-gray-800")}
            >
              {t("location.title")}
            </motion.h2>

            {/* Decorative Divider */}
            <motion.div
              variants={scaleIn}
              className={cn("flex items-center justify-center gap-4 pt-4")}
            >
              <div className={cn("h-[1px] w-12 bg-rose-200")} />
              <MapPin className={cn("w-5 h-5 text-rose-400")} />
              <div className={cn("h-[1px] w-12 bg-rose-200")} />
            </motion.div>
          </motion.div>

          {/* One card per venue */}
          <div className={cn("max-w-6xl mx-auto space-y-12")}>
            {config.agenda.map((venue) => {
              const maps = getMapLinks(venue);

              return (
                <motion.div
                  key={venue.title}
                  variants={staggerContainer()}
                  initial="hidden"
                  whileInView="visible"
                  viewport={VIEWPORT_REVEAL}
                  className={cn("space-y-4")}
                >
                  <motion.div
                    variants={scaleIn}
                    className={cn(
                      "w-full h-[280px] rounded-2xl overflow-hidden shadow-lg border-8 border-white",
                    )}
                  >
                    <iframe
                      src={maps.embed}
                      title={venue.location}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen=""
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className={cn("w-full h-full")}
                    ></iframe>
                  </motion.div>

                  <motion.div
                    variants={scaleIn}
                    className={cn(
                      "bg-white rounded-2xl p-8 shadow-lg border border-gray-100",
                    )}
                  >
                    <span
                      className={cn(
                        "text-xs font-semibold tracking-[3px] uppercase text-rose-500",
                      )}
                    >
                      {venue.title}
                    </span>
                    <h3
                      className={cn(
                        "text-2xl font-serif text-gray-800 mt-1 mb-6",
                      )}
                    >
                      {venue.location}
                    </h3>

                    <div className={cn("space-y-4")}>
                      <div className={cn("flex items-start space-x-4")}>
                        <MapPin className={cn("w-5 h-5 text-rose-500 mt-1")} />
                        <p className={cn("text-gray-600 flex-1")}>
                          {venue.address}
                        </p>
                      </div>

                      <div className={cn("flex items-center space-x-4")}>
                        <CalendarCheck
                          className={cn("w-5 h-5 text-rose-500")}
                        />
                        <p className={cn("text-gray-600")}>
                          {formatEventDate(venue.date)}
                        </p>
                      </div>

                      <div className={cn("flex items-center space-x-4")}>
                        <Clock className={cn("w-5 h-5 text-rose-500")} />
                        <p className={cn("text-gray-600")}>
                          {formatTime12h(venue.startTime)}
                        </p>
                      </div>

                      {/* Action Button - Full Width */}
                      <div className={cn("pt-4")}>
                        <motion.a
                          href={maps.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={cn(
                            "w-full flex items-center justify-center gap-1.5 bg-white text-gray-600 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm",
                          )}
                        >
                          <ExternalLink className={cn("w-3.5 h-3.5")} />
                          <span className={cn("font-semibold")}>
                            {t("location.viewMap")}
                          </span>
                        </motion.a>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
