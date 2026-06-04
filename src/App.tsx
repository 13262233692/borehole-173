import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import Home from "@/pages/Home";
import BoreholeList from "@/pages/BoreholeList";
import BoreholeForm from "@/pages/BoreholeForm";
import BoreholeDetail from "@/pages/BoreholeDetail";
import SectionAnalysis from "@/pages/SectionAnalysis";
import SpatialQuery from "@/pages/SpatialQuery";
import Borehole3DPage from "@/pages/Borehole3DPage";
import ExportPage from "@/pages/ExportPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/boreholes" element={<BoreholeList />} />
          <Route path="/boreholes/new" element={<BoreholeForm />} />
          <Route path="/boreholes/edit/:id" element={<BoreholeForm />} />
          <Route path="/boreholes/:id" element={<BoreholeDetail />} />
          <Route path="/section" element={<SectionAnalysis />} />
          <Route path="/spatial" element={<SpatialQuery />} />
          <Route path="/3d" element={<Borehole3DPage />} />
          <Route path="/export" element={<ExportPage />} />
        </Route>
        <Route path="/other" element={<div className="text-center text-xl">Other Page - Coming Soon</div>} />
      </Routes>
    </Router>
  );
}
