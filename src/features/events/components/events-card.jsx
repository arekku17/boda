// EventCard.jsx
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Clock,
  MapPin,
  CalendarPlus,
  X,
  Globe,
  Apple,
  Calendar as CalendarIcon,
} from "lucide-react";
import { formatEventDate, formatTime12h } from "@/lib/format-event-date";
import { useTranslation } from "@/lib/i18n";
import { useMotionPreset, VIEWPORT_REVEAL } from "@/lib/motion";

const Modal = ({ isOpen, onClose, children }) => {
  const fade = useMotionPreset("fade");
  const scaleIn = useMotionPreset("scaleIn");

  return (
    <AnimatePresence>
      {isOpen && (
        // Centered with flex instead of left/top + translate: Motion drives
        // the `transform` style directly, which would otherwise clobber a
        // CSS -translate-x/y-1/2 centering trick and push the modal off-center.
        <motion.div
          variants={fade}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClose}
          className={cn(
            "fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm",
          )}
        >
          <motion.div
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className={cn("w-full max-w-sm")}
          >
            <div
              className={cn(
                "bg-white rounded-2xl p-6 shadow-2xl border border-gray-100",
              )}
            >
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Builds start/end dates in the event's UTC offset; end defaults to 2 hours later
const getEventRange = (eventData) => {
  const offset = eventData.utcOffset || "";
  const startDate = new Date(`${eventData.date}T${eventData.startTime}:00${offset}`);
  const endDate = eventData.endTime
    ? new Date(`${eventData.date}T${eventData.endTime}:00${offset}`)
    : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
  return { startDate, endDate };
};

const CalendarButton = ({ icon: Icon, label, onClick, className = "" }) => (
  <motion.button
    onClick={onClick}
    className={cn(
      "flex items-center space-x-3 w-full p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors",
      className,
    )}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    <Icon className={cn("w-5 h-5")} />
    <span className={cn("text-gray-700 font-medium")}>{label}</span>
  </motion.button>
);

/**
 * SingleEventCard component displays an event card with options to add the event
 * to various calendars (Google Calendar, Apple Calendar, and Outlook Calendar).
 *
 * @component
 * @param {Object} props - Component props.
 * @param {Object} props.eventData - Object containing event data.
 * @param {string} props.eventData.date - The date of the event (expected format: YYYY-MM-DD).
 * @param {string} props.eventData.startTime - The start time of the event (expected format: HH:mm).
 * @param {string} props.eventData.endTime - The end time of the event (expected format: HH:mm).
 * @param {string} props.eventData.title - The title of the event.
 * @param {string} props.eventData.description - A description of the event.
 * @param {string} props.eventData.location - The location where the event takes place.
 * @param {string} props.eventData.timeZone - The time zone of the event.
 *
 * @example
 * const eventData = {
 *   date: '2023-10-15',
 *   startTime: '14:00',
 *   endTime: '16:00',
 *   title: 'Wedding Ceremony - Reception',
 *   description: 'Join us to celebrate the wedding ceremony and reception.',
 *   location: 'Sunset Gardens',
 *   timeZone: 'Asia/Jakarta'
 * };
 *
 * <SingleEventCard eventData={eventData} />
 *
 * @returns {JSX.Element} A JSX element representing the event card.
 */
const SingleEventCard = ({ eventData }) => {
  const { t } = useTranslation();
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const scaleIn = useMotionPreset("scaleIn");

  const googleCalendarLink = () => {
    const { startDate, endDate } = getEventRange(eventData);

    const formatDate = (date) => {
      return date.toISOString().replace(/-|:|\.\d+/g, "");
    };

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventData.title)}&dates=${formatDate(startDate)}/${formatDate(endDate)}&details=${encodeURIComponent(eventData.description)}&location=${encodeURIComponent(eventData.location)}&ctz=${eventData.timeZone}`;
  };

  const generateICSContent = () => {
    const { startDate, endDate } = getEventRange(eventData);

    const formatICSDate = (date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    return `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
URL:${window.location.href}
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:${eventData.title}
DESCRIPTION:${eventData.description}
LOCATION:${eventData.location}
END:VEVENT
END:VCALENDAR`;
  };

  const downloadICSFile = () => {
    const icsContent = generateICSContent();
    const blob = new Blob([icsContent], {
      type: "text/calendar;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${eventData.title.toLowerCase().replace(/ /g, "-")}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={cn("relative")}>
      <motion.div
        className={cn(
          "bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4",
        )}
        variants={scaleIn}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT_REVEAL}
      >
        <h3 className={cn("text-xl font-semibold text-gray-800")}>
          {eventData.title.split(" - ")[0]}
        </h3>
        <div className={cn("space-y-3 text-gray-600")}>
          <div className={cn("flex items-center space-x-3")}>
            <Calendar className={cn("w-5 h-5 text-rose-500")} />
            <span>{formatEventDate(eventData.date)}</span>
          </div>
          <div className={cn("flex items-center space-x-3")}>
            <Clock className={cn("w-5 h-5 text-rose-500")} />
            <span>
              {formatTime12h(eventData.startTime)}
              {eventData.endTime && ` - ${formatTime12h(eventData.endTime)}`}
            </span>
          </div>
          <div className={cn("flex items-start space-x-3")}>
            <MapPin className={cn("w-5 h-5 text-rose-500")} />
            <span>
              {eventData.location}
              <span className={cn("block text-sm text-gray-500")}>
                {eventData.address}
              </span>
            </span>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowCalendarModal(true)}
          className={cn(
            "w-full flex items-center justify-center gap-1.5 bg-white text-gray-600 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm",
          )}
        >
          <CalendarPlus className={cn("w-3.5 h-3.5")} />
          <span className={cn("font-semibold")}>
            {t("events.addToCalendar")}
          </span>
        </motion.button>
      </motion.div>
      <Modal
        isOpen={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
      >
        <div className={cn("space-y-6")}>
          <div className={cn("flex items-center justify-between")}>
            <h3 className={cn("text-xl font-semibold text-gray-800")}>
              {t("events.addToCalendar")}
            </h3>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowCalendarModal(false)}
              className={cn("text-gray-500 hover:text-gray-700")}
            >
              <X className={cn("w-5 h-5")} />
            </motion.button>
          </div>

          <div className={cn("space-y-3")}>
            <CalendarButton
              icon={(props) => (
                <Globe {...props} className={cn("w-5 h-5 text-rose-500")} />
              )}
              label={t("events.googleCalendar")}
              onClick={() => window.open(googleCalendarLink(), "_blank")}
            />

            <CalendarButton
              icon={(props) => (
                <Apple {...props} className={cn("w-5 h-5 text-gray-900")} />
              )}
              label={t("events.appleCalendar")}
              onClick={downloadICSFile}
            />

            <CalendarButton
              icon={(props) => (
                <CalendarIcon
                  {...props}
                  className={cn("w-5 h-5 text-blue-600")}
                />
              )}
              label={t("events.outlookCalendar")}
              onClick={downloadICSFile}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Main EventCards component that handles multiple events
const EventCards = ({ events }) => {
  return (
    <div className={cn("space-y-4")}>
      {events.map((event, index) => (
        <SingleEventCard key={index} eventData={event} />
      ))}
    </div>
  );
};

export default EventCards;
