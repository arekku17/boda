import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Gift } from "lucide-react";
import { useConfig } from "@/features/invitation/hooks/use-config";
import { fetchGifts, resolveApiUrl } from "@/services/api";
import { LanguageProvider, useTranslation } from "@/lib/i18n";
import { useMotionPreset, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

function GiftsPageContent() {
  const config = useConfig();
  const { t } = useTranslation();
  const fadeUp = useMotionPreset("fadeUp");
  const scaleIn = useMotionPreset("scaleIn");
  const giftsQuery = useQuery({ queryKey: ["gifts"], queryFn: fetchGifts });
  const gifts = giftsQuery.data?.data || [];

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `${t("giftsPage.title")} · ${config.brideName} & ${config.groomName}`;
  }, [t, config.brideName, config.groomName]);

  return (
    <div
      className={cn(
        "min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100 flex justify-center",
      )}
    >
      <div
        className={cn(
          "mx-auto w-full max-w-[430px] min-h-screen bg-white relative border border-gray-200 shadow-lg px-4 py-6",
        )}
      >
        {/* Returning opens the invitation directly instead of the landing page */}
        <Link
          to="/"
          state={{ openInvitation: true }}
          className={cn(
            "inline-flex items-center gap-2 text-sm text-gray-600 hover:text-rose-600 transition-colors",
          )}
        >
          <ArrowLeft className={cn("w-4 h-4")} />
          <span>{t("giftsPage.back")}</span>
        </Link>

        <motion.div
          variants={staggerContainer()}
          initial="hidden"
          animate="visible"
          className={cn("text-center space-y-4 mt-10 mb-10")}
        >
          <motion.span
            variants={fadeUp}
            className={cn("inline-block text-rose-500 font-medium")}
          >
            {t("giftsPage.title")}
          </motion.span>

          <motion.h1
            variants={fadeUp}
            className={cn("text-5xl font-script text-rose-600 py-1")}
          >
            {config.brideName}{" "}
            <span className={cn("font-amp text-rose-400")}>&</span>{" "}
            {config.groomName}
          </motion.h1>

          <motion.div
            variants={scaleIn}
            className={cn("flex items-center justify-center gap-4")}
          >
            <div className={cn("h-[1px] w-12 bg-rose-200")} />
            <Gift className={cn("w-5 h-5 text-rose-400")} />
            <div className={cn("h-[1px] w-12 bg-rose-200")} />
          </motion.div>

          <motion.p
            variants={fadeUp}
            className={cn("text-gray-600 leading-relaxed max-w-sm mx-auto")}
          >
            {t("giftsPage.message")}
          </motion.p>
        </motion.div>

        {giftsQuery.isLoading && (
          <p className={cn("text-center text-gray-500")}>
            {t("giftsPage.loading")}
          </p>
        )}

        {giftsQuery.isError && (
          <p className={cn("text-center text-gray-500")}>
            {t("giftsPage.error")}
          </p>
        )}

        {giftsQuery.isSuccess && gifts.length === 0 && (
          <p className={cn("text-center text-gray-500")}>
            {t("giftsPage.empty")}
          </p>
        )}

        {gifts.length > 0 && (
          <motion.ul
            variants={staggerContainer()}
            initial="hidden"
            animate="visible"
            className={cn("space-y-5 pb-8")}
          >
            {gifts.map((gift) => (
              <motion.li
                key={gift.id}
                variants={fadeUp}
                className={cn(
                  "bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden",
                )}
              >
                <div
                  className={cn(
                    "aspect-[4/3] bg-rose-50 flex items-center justify-center",
                  )}
                >
                  {gift.image ? (
                    <img
                      src={resolveApiUrl(gift.image)}
                      alt={gift.name}
                      loading="lazy"
                      className={cn("w-full h-full object-cover")}
                    />
                  ) : (
                    <Gift className={cn("w-12 h-12 text-rose-300")} />
                  )}
                </div>

                <div className={cn("p-5 space-y-3")}>
                  <div>
                    <h2 className={cn("font-medium text-gray-800")}>
                      {gift.name}
                    </h2>
                    {gift.store && (
                      <p className={cn("text-sm text-gray-500")}>
                        {gift.store}
                      </p>
                    )}
                  </div>

                  <a
                    href={gift.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "w-full flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors",
                    )}
                  >
                    <span>{t("giftsPage.buy")}</span>
                    <ExternalLink className={cn("w-4 h-4")} />
                  </a>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </div>
    </div>
  );
}

export default function GiftsPage() {
  const config = useConfig();

  return (
    <LanguageProvider language={config?.language || "es"}>
      <GiftsPageContent />
    </LanguageProvider>
  );
}
