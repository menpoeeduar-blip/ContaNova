import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import clientesRouter from "./clientes";
import proveedoresRouter from "./proveedores";
import productosRouter from "./productos";
import facturasRouter from "./facturas";
import comprasRouter from "./compras";
import carteraRouter from "./cartera";
import contabilidadRouter from "./contabilidad";
import crmRouter from "./crm";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(clientesRouter);
router.use(proveedoresRouter);
router.use(productosRouter);
router.use(facturasRouter);
router.use(comprasRouter);
router.use(carteraRouter);
router.use(contabilidadRouter);
router.use(crmRouter);

export default router;
