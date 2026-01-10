import { Router } from "express";
import authRoutes from "./auth.routes";
import eventRoutes from "./event.routes";
import formRouter from "./form.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/events", eventRoutes);
router.use("form", formRouter);

export default router;