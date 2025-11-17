import os
from fastapi import APIRouter, Body, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel, ValidationError
from typing import List, Dict, Any, Optional
from uuid import uuid4
from app.services.report_generator import ReportGenerator
import json

router = APIRouter()

from fastapi import APIRouter, Body, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel, ValidationError, ConfigDict, Field
from typing import List, Dict, Any, Optional
from uuid import uuid4
from app.services.report_generator import ReportGenerator
import json
import zipfile
import tempfile
from pathlib import Path

router = APIRouter()

class ReportSettings(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    title: str
    report_language: str = Field(default="en", alias="reportLanguage")
    include_company_info: bool = Field(default=True, alias="includeCompanyInfo")
    include_device_info: bool = Field(default=True, alias="includeDeviceInfo")
    include_customer_info: bool = Field(default=True, alias="includeCustomerInfo")
    include_measuring_site: bool = Field(default=True, alias="includeMeasuringSite")
    include_task: bool = Field(default=True, alias="includeTask")
    include_building_description: bool = Field(default=True, alias="includeBuildingDescription")
    include_weather_conditions: bool = Field(default=True, alias="includeWeatherConditions")
    include_images: bool = Field(default=True, alias="includeImages")
    include_markers: bool = Field(default=True, alias="includeMarkers")
    include_regions: bool = Field(default=True, alias="includeRegions")
    include_parameters: bool = Field(default=True, alias="includeParameters")

    company: str = ""
    device: str = ""
    serial_number: str = Field(default="", alias="serialNumber")
    lens: str = ""
    customer: str = ""
    measuring_site: str = Field(default="", alias="measuringSite")
    task: str = ""
    building_description: str = Field(default="", alias="buildingDescription")
    construction: str = ""
    orientation: str = ""
    vicinity: str = ""

    outer_temp_min_24h: str = Field(default="", alias="outerTempMin24h")
    outer_temp_max_24h: str = Field(default="", alias="outerTempMax24h")
    outer_temp_min_while: str = Field(default="", alias="outerTempMinWhile")
    outer_temp_max_while: str = Field(default="", alias="outerTempMaxWhile")
    solar_radiation_12h: str = Field(default="", alias="solarRadiation12h")
    solar_radiation_while: str = Field(default="", alias="solarRadiationWhile")
    precipitation: str = ""
    wind_velocity: str = Field(default="", alias="windVelocity")
    wind_direction: str = Field(default="", alias="windDirection")
    inner_air_temp: str = Field(default="", alias="innerAirTemp")
    temp_difference: str = Field(default="", alias="tempDifference")
    pressure_difference: str = Field(default="", alias="pressureDifference")
    further_factors: str = Field(default="", alias="furtherFactors")
    deviations: str = ""
    notes: str = ""

class ImageData(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    id: str
    name: str
    thermal_base64: Optional[str] = Field(default=None, alias="thermalBase64")
    real_base64: Optional[str] = Field(default=None, alias="realBase64")
    csv_url: Optional[str] = Field(default=None, alias="csvUrl")

class MarkerData(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    id: str
    image_id: str = Field(alias="imageId")
    label: str
    x: float
    y: float
    temperature: float

class RegionData(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    id: str
    image_id: str = Field(alias="imageId")
    label: str
    type: str
    points: List[Dict[str, float]]
    min_temp: float = Field(alias="minTemp")
    max_temp: float = Field(alias="maxTemp")
    avg_temp: float = Field(alias="avgTemp")

class GenerateReportRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    project_id: str = Field(alias="projectId")
    project_name: str = Field(alias="projectName")
    operator: str
    company: str
    settings: ReportSettings
    images: List[ImageData]
    markers: List[MarkerData]
    regions: List[RegionData]
    global_parameters: Dict[str, Any] = Field(alias="globalParameters")
    format: str  # "pdf" or "docx"

@router.post("/debug")
async def debug_report_request(request: Request):
    """
    Debug endpoint to see raw request body
    """
    try:
        body = await request.json()
        print("[DEBUG] Raw request body received:")
        print(json.dumps(body, indent=2, ensure_ascii=False))
        
        # Try to validate
        try:
            validated = GenerateReportRequest(**body)
            return {"status": "valid", "message": "Request is valid"}
        except ValidationError as e:
            print(f"[DEBUG] Validation error: {e}")
            return {"status": "invalid", "errors": e.errors()}
    except Exception as e:
        print(f"[DEBUG] Error: {e}")
        return {"status": "error", "message": str(e)}

@router.post("/generate")
async def generate_report(request: GenerateReportRequest):
    """
    Generate a thermal analysis report in PDF or DOCX format
    """
    try:
        print(f"[DEBUG] Received report request: projectId={request.project_id}, format={request.format}")
        print(f"[DEBUG] Settings title: {request.settings.title}")
        print(f"[DEBUG] Number of images: {len(request.images)}")
        print(f"[DEBUG] Number of markers: {len(request.markers)}")
        print(f"[DEBUG] Number of regions: {len(request.regions)}")
        
        generator = ReportGenerator()

        # Prepare metadata
        metadata = {
            "title": request.settings.title,
            "project_name": request.project_name,
            "operator": request.operator,
            "company": request.company,
            # Device info from settings
            "device": request.settings.device,
            "serial_number": request.settings.serial_number,
            "lens": request.settings.lens,
            "customer": request.settings.customer,
            "measuring_site": request.settings.measuring_site,
            "task": request.settings.task,
        }
        
        # Add thermal parameters from globalParameters if available
        if request.global_parameters:
            # Camera and device info
            if "cameraModel" in request.global_parameters:
                metadata["cameraModel"] = request.global_parameters["cameraModel"]
            if "camera_model" in request.global_parameters:
                metadata["camera_model"] = request.global_parameters["camera_model"]
            
            # Thermal measurement parameters
            thermal_keys = ["emissivity", "ambientTemp", "ambient_temp", "reflectedTemp", 
                          "reflected_temp", "humidity", "distance", "timestamp"]
            for key in thermal_keys:
                if key in request.global_parameters:
                    metadata[key] = request.global_parameters[key]
            
            # Add any other parameters
            for key, value in request.global_parameters.items():
                if key not in metadata:
                    metadata[key] = value

        # Prepare images data (including CSV URLs for histogram)
        images_data = []
        for img in request.images:
            img_dict = {
                "id": img.id,
                "name": img.name,
                "thermal_base64": img.thermal_base64,
                "real_base64": img.real_base64,
                "csv_url": img.csv_url
            }
            images_data.append(img_dict)

        # Prepare markers data
        markers_data = []
        for marker in request.markers:
            markers_data.append({
                "id": marker.id,
                "image_id": marker.image_id,
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
                "image_id": region.image_id,
                "label": region.label,
                "type": region.type,
                "points": region.points,
                "min_temp": region.min_temp,
                "max_temp": region.max_temp,
                "avg_temp": region.avg_temp
            })

        # Generate report
        if request.format == "pdf":
            report_path = generator.generate_pdf_report(
                project_id=request.project_id,
                metadata=metadata,
                images=images_data,
                markers=markers_data,
                regions=regions_data,
                notes=request.settings.notes,
                language=request.settings.report_language
            )
        elif request.format == "docx":
            report_path = generator.generate_docx_report(
                project_id=request.project_id,
                metadata=metadata,
                images=images_data,
                markers=markers_data,
                regions=regions_data,
                notes=request.settings.notes,
                language=request.settings.report_language
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

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating report: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-bilingual")
async def generate_bilingual_report(request: GenerateReportRequest):
    """
    Generate both Persian and English reports and return as ZIP
    """
    try:
        print(f"[DEBUG] Generating bilingual reports for project: {request.project_id}")
        
        generator = ReportGenerator()

        # Prepare metadata (same as single report)
        metadata = {
            "title": request.settings.title,
            "project_name": request.project_name,
            "operator": request.operator,
            "company": request.company,
            # Device info from settings
            "device": request.settings.device,
            "serial_number": request.settings.serial_number,
            "lens": request.settings.lens,
            "customer": request.settings.customer,
            "measuring_site": request.settings.measuring_site,
            "task": request.settings.task,
        }
        
        # Add thermal parameters from globalParameters
        if request.global_parameters:
            if "cameraModel" in request.global_parameters:
                metadata["cameraModel"] = request.global_parameters["cameraModel"]
            if "camera_model" in request.global_parameters:
                metadata["camera_model"] = request.global_parameters["camera_model"]
            
            thermal_keys = ["emissivity", "ambientTemp", "ambient_temp", "reflectedTemp", 
                          "reflected_temp", "humidity", "distance", "timestamp"]
            for key in thermal_keys:
                if key in request.global_parameters:
                    metadata[key] = request.global_parameters[key]
            
            for key, value in request.global_parameters.items():
                if key not in metadata:
                    metadata[key] = value

        # Prepare images data (including CSV URLs for histogram)
        images_data = []
        for img in request.images:
            img_dict = {
                "id": img.id,
                "name": img.name,
                "thermal_base64": img.thermal_base64,
                "real_base64": img.real_base64,
                "csv_url": img.csv_url
            }
            images_data.append(img_dict)

        # Prepare markers data
        markers_data = []
        for marker in request.markers:
            markers_data.append({
                "id": marker.id,
                "image_id": marker.image_id,
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
                "image_id": region.image_id,
                "label": region.label,
                "type": region.type,
                "points": region.points,
                "min_temp": region.min_temp,
                "max_temp": region.max_temp,
                "avg_temp": region.avg_temp
            })

        # Generate both reports
        reports = {}
        
        # English report
        print("[DEBUG] Generating English report...")
        if request.format == "pdf":
            en_path = generator.generate_pdf_report(
                project_id=request.project_id,
                metadata=metadata,
                images=images_data,
                markers=markers_data,
                regions=regions_data,
                notes=request.settings.notes,
                language="en"
            )
        else:
            en_path = generator.generate_docx_report(
                project_id=request.project_id,
                metadata=metadata,
                images=images_data,
                markers=markers_data,
                regions=regions_data,
                notes=request.settings.notes,
                language="en"
            )
        reports["english"] = en_path
        
        # Persian report
        print("[DEBUG] Generating Persian report...")
        if request.format == "pdf":
            fa_path = generator.generate_pdf_report(
                project_id=request.project_id,
                metadata=metadata,
                images=images_data,
                markers=markers_data,
                regions=regions_data,
                notes=request.settings.notes,
                language="fa"
            )
        else:
            fa_path = generator.generate_docx_report(
                project_id=request.project_id,
                metadata=metadata,
                images=images_data,
                markers=markers_data,
                regions=regions_data,
                notes=request.settings.notes,
                language="fa"
            )
        reports["persian"] = fa_path
        
        # Check if both reports exist
        if not os.path.exists(en_path) or not os.path.exists(fa_path):
            raise HTTPException(status_code=500, detail="Report generation failed")
        
        # Create ZIP file
        with tempfile.NamedTemporaryFile(mode='wb', suffix='.zip', delete=False) as zip_tmp:
            zip_path = zip_tmp.name
            
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Add English report
            en_filename = f"{request.settings.title.replace(' ', '_')}_English.{request.format}"
            zipf.write(en_path, en_filename)
            
            # Add Persian report
            fa_filename = f"{request.settings.title.replace(' ', '_')}_Persian.{request.format}"
            zipf.write(fa_path, fa_filename)
        
        print(f"[DEBUG] ZIP file created: {zip_path}")
        
        # Return ZIP file
        zip_filename = f"{request.settings.title.replace(' ', '_')}_Reports.zip"
        return FileResponse(
            path=zip_path,
            filename=zip_filename,
            media_type="application/zip"
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating bilingual reports: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
