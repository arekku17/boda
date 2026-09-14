import { useTranslation } from "@/lib/i18n";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { Gift, ArrowRight } from "lucide-react";
import { useMotionPreset, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

export default function Gifts() {
  const { t } = useTranslation();
  const fade = useMotionPreset("fade");
  const fadeUp = useMotionPreset("fadeUp");
  const scaleIn = useMotionPreset("scaleIn");

  return (
    <section id="gifts" className={cn("relative overflow-hidden")}>
      <div className={cn("container mx-auto px-4 py-20 relative z-10")}>
        <motion.div
          variants={staggerContainer()}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className={cn("text-center space-y-4")}
        >
          <motion.span
            variants={fadeUp}
            className={cn("inline-block text-rose-500 font-medium")}
          >
            {t("gifts.subTitle")}
          </motion.span>

          <motion.h2
            variants={fadeUp}
            className={cn("text-4xl md:text-5xl font-serif text-gray-800")}
          >
            {t("gifts.title")}
          </motion.h2>

          {/* Decorative Divider */}
          <motion.div
            variants={scaleIn}
            className={cn("flex items-center justify-center gap-4 pt-4")}
          >
            <div className={cn("h-[1px] w-12 bg-rose-200")} />
            <Gift className={cn("w-5 h-5 text-rose-400")} />
            <div className={cn("h-[1px] w-12 bg-rose-200")} />
          </motion.div>

          <motion.p
            variants={fade}
            className={cn("text-gray-600 leading-relaxed max-w-md mx-auto")}
          >
            {t("gifts.message")}
          </motion.p>

          <motion.div variants={fadeUp} className={cn("pt-4")}>
            <Link
              to="/regalos"
              className={cn(
                "inline-flex items-center justify-center gap-2 bg-rose-500 text-white px-8 py-3 rounded-xl font-medium shadow-lg hover:bg-rose-600 transition-colors",
              )}
            >
              <Gift className={cn("w-4 h-4")} />
              <span>{t("gifts.viewGifts")}</span>
              <ArrowRight className={cn("w-4 h-4")} />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
