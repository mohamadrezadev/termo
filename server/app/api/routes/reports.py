import os
from fastapi import APIRouter, Body, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from uuid import uuid4
from app.services.report_generator import ReportGenerator

router = APIRouter()

class ReportSettings(BaseModel):
    title: str
    reportLanguage: str = "en"
    includeCompanyInfo: bool = True
    includeDeviceInfo: bool = True
    includeCustomerInfo: bool = True
    includeMeasuringSite: bool = True
    includeTask: bool = True
    includeBuildingDescription: bool = True
    includeWeatherConditions: bool = True
    includeImages: bool = True
    includeMarkers: bool = True
    includeRegions: bool = True
    includeParameters: bool = True

    company: str = ""
    device: str = ""
    serialNumber: str = ""
    lens: str = ""
    customer: str = ""
    measuringSite: str = ""
    task: str = ""
    buildingDescription: str = ""
    construction: str = ""
    orientation: str = ""
    vicinity: str = ""

    outerTempMin24h: str = ""
    outerTempMax24h: str = ""
    outerTempMinWhile: str = ""
    outerTempMaxWhile: str = ""
    solarRadiation12h: str = ""
    solarRadiationWhile: str = ""
    precipitation: str = ""
    windVelocity: str = ""
    windDirection: str = ""
    innerAirTemp: str = ""
    tempDifference: str = ""
    pressureDifference: str = ""
    furtherFactors: str = ""
    deviations: str = ""
    notes: str = ""

class ImageData(BaseModel):
    id: str
    name: str
    thermalBase64: Optional[str] = None
    realBase64: Optional[str] = None

class MarkerData(BaseModel):
    id: str
    imageId: str
    label: str
    x: float
    y: float
    temperature: float

class RegionData(BaseModel):
    id: str
    imageId: str
    label: str
    type: str
    points: List[Dict[str, float]]
    minTemp: float
    maxTemp: float
    avgTemp: float

class GenerateReportRequest(BaseModel):
    projectId: str
    projectName: str
    operator: str
    company: str
    settings: ReportSettings
    images: List[ImageData]
    markers: List[MarkerData]
    regions: List[RegionData]
    globalParameters: Dict[str, Any]
    format: str  # "pdf" or "docx"

@router.post("/generate")
async def generate_report(request: GenerateReportRequest):
    """
    Generate a thermal analysis report in PDF or DOCX format
    """
    try:
        generator = ReportGenerator()

        # Prepare metadata
        metadata = {
            "title": request.settings.title,
            "project_name": request.projectName,
            "operator": request.operator,
            "company": request.company,
            **request.globalParameters
        }

        # Prepare images data
        images_data = []
        for img in request.images:
            img_dict = {
                "id": img.id,
                "name": img.name,
                "thermal_base64": img.thermalBase64,
                "real_base64": img.realBase64
            }
            images_data.append(img_dict)

        # Prepare markers data
        markers_data = []
        for marker in request.markers:
            markers_data.append({
                "id": marker.id,
                "image_id": marker.imageId,
                "label": marker.label,
                "x": marker.x,
                "y": marker.y,
                "temperature": marker.temperature
            })

        # Prepare regions data
        regions_data = []
        for region in request.regions:
            regions_data.append({
                "id": region.id,
                "image_id": region.imageId,
                "label": region.label,
                "type": region.type,
                "points": region.points,
                "min_temp": region.minTemp,
                "max_temp": region.maxTemp,
                "avg_temp": region.avgTemp
            })

        # Generate report
        if request.format == "pdf":
            report_path = generator.generate_pdf_report(
                project_id=request.projectId,
                metadata=metadata,
                images=images_data,
                markers=markers_data,
                regions=regions_data,
                notes=request.settings.notes,
                language=request.settings.reportLanguage
            )
        elif request.format == "docx":
            report_path = generator.generate_docx_report(
                project_id=request.projectId,
                metadata=metadata,
                images=images_data,
                markers=markers_data,
                regions=regions_data,
                notes=request.settings.notes,
                language=request.settings.reportLanguage
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid format. Must be 'pdf' or 'docx'")

        # Return file
        if not os.path.exists(report_path):
            raise HTTPException(status_code=500, detail="Report generation failed")

        filename = f"{request.settings.title.replace(' ', '_')}.{request.format}"
        return FileResponse(
            path=report_path,
            filename=filename,
            media_type="application/pdf" if request.format == "pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )

    except Exception as e:
        print(f"Error generating report: {e}")
        raise HTTPException(status_code=500, detail=str(e))
