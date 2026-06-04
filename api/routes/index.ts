import { Router } from 'express';
import { boreholeController } from '../controllers/BoreholeController';
import { spatialController } from '../controllers/SpatialController';
import { exportController } from '../controllers/ExportController';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/boreholes', boreholeController.getBoreholes.bind(boreholeController));
router.get('/boreholes/:id', boreholeController.getBoreholeById.bind(boreholeController));
router.post('/boreholes', boreholeController.createBorehole.bind(boreholeController));
router.put('/boreholes/:id', boreholeController.updateBorehole.bind(boreholeController));
router.delete('/boreholes/:id', boreholeController.deleteBorehole.bind(boreholeController));

router.post('/boreholes/:id/layers', boreholeController.addLayer.bind(boreholeController));
router.put('/boreholes/:id/layers/:layerId', boreholeController.updateLayer.bind(boreholeController));
router.delete('/boreholes/:id/layers/:layerId', boreholeController.deleteLayer.bind(boreholeController));

router.get('/lithology', boreholeController.getLithologyDict.bind(boreholeController));
router.get('/projects', boreholeController.getProjects.bind(boreholeController));

router.post('/section/generate', boreholeController.generateSection.bind(boreholeController));
router.post('/section', boreholeController.saveSectionLine.bind(boreholeController));
router.get('/section', boreholeController.getSectionLines.bind(boreholeController));

router.post('/spatial/query', spatialController.spatialQuery.bind(spatialController));
router.get('/spatial/nearby', spatialController.findNearby.bind(spatialController));
router.get('/spatial/nearline', spatialController.findBoreholesNearLine.bind(spatialController));
router.get('/spatial/statistics', spatialController.getStatistics.bind(spatialController));
router.get('/spatial/faults', spatialController.getFaults.bind(spatialController));
router.post('/spatial/faults', spatialController.createFault.bind(spatialController));
router.delete('/spatial/faults/:id', spatialController.deleteFault.bind(spatialController));

router.post('/export/excel', exportController.exportExcel.bind(exportController));
router.post('/export/dxf', exportController.exportDXF.bind(exportController));
router.post('/export/chart', exportController.exportChartSVG.bind(exportController));
router.get('/export/download/:filename', exportController.downloadFile.bind(exportController));

export default router;
