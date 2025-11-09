#pragma once

//! HRESULT-like enum
typedef enum 
{
  TESTO_IRAPI_OK = 0,      //!< Call success
  TESTO_IRAPI_ERR_ARG,     //!< Invalid argument
  TESTO_IRAPI_ERR_ID,      //!< Invalid object id 
  TESTO_IRAPI_ERR_STRING,  //!< String allocation failed 
  TESTO_IRAPI_ERR_COMPONENT_MISSING,  //!< Component not found in image (e.g. visual/thermal image) 
  TESTO_IRAPI_ERR_FILE_IO, //!< File IO failed 
  TESTO_IRAPI_ERR_GENERIC, //!< Generic IrApi error 
  TESTO_IRAPI_NOT_IMPL     //!< Function not implemented 
} TESTO_IRAPI_RESULT;

//! Unit types (temperature for now)
typedef enum 
{
  TESTO_IRAPI_UNIT_CELSIUS = 0,   //!< Celsius
  TESTO_IRAPI_UNIT_FAHRENHEIT     //!< Fahrenheit
} TESTO_IRAPI_UNIT;

//! Palettes
typedef enum 
{
  TESTO_IRAPI_PALETTE_IRONBOW,
  TESTO_IRAPI_PALETTE_RAINBOW,
  TESTO_IRAPI_PALETTE_GREYSCALE,
  TESTO_IRAPI_PALETTE_GREYSCALEINV,
  TESTO_IRAPI_PALETTE_SEPIA,
  TESTO_IRAPI_PALETTE_BLUERED,
  TESTO_IRAPI_PALETTE_HOTCOLD,
  TESTO_IRAPI_PALETTE_TESTO,
  TESTO_IRAPI_PALETTE_DEWPOINT,
  TESTO_IRAPI_PALETTE_HOCHTEMP,
  TESTO_IRAPI_PALETTE_RAINBOWHC
} TESTO_IRAPI_PALETTE;

/*! \file 
\brief Native C interface
*/ 

#if defined TESTO_IRAPI_MAKEDLL 
  //! Dll interface
  #define TESTO_IRAPI_EXPORT __declspec(dllexport)
#else  
  //! Dll interface
  #define TESTO_IRAPI_EXPORT __declspec(dllimport)
#endif 

#ifdef __cplusplus
extern "C"
{
#endif
  //! Returns string literal, describing val 
  TESTO_IRAPI_EXPORT const wchar_t* testo_irimage_error_string(TESTO_IRAPI_RESULT val);
  //! Opens  BMT image from file
  TESTO_IRAPI_EXPORT TESTO_IRAPI_RESULT testo_irimage_open(int* id, const wchar_t* fname);   
  //! Closes BMT file with handle 'id'
  TESTO_IRAPI_EXPORT TESTO_IRAPI_RESULT testo_irimage_close(int id);   

  //! Returns image width
  TESTO_IRAPI_EXPORT TESTO_IRAPI_RESULT testo_irimage_get_width(int id, int* width);   
  //! Returns image height
  TESTO_IRAPI_EXPORT TESTO_IRAPI_RESULT testo_irimage_get_height(int id, int* height);   

  //! Returns emissivity
  TESTO_IRAPI_EXPORT TESTO_IRAPI_RESULT testo_irimage_get_emissivity(int id, double* emissivity);   
  //! Sets emissivity
  TESTO_IRAPI_EXPORT TESTO_IRAPI_RESULT testo_irimage_set_emissivity(int id, double val);   
  //! Returns reflective temperature
  TESTO_IRAPI_EXPORT TESTO_IRAPI_RESULT testo_irimage_get_reflected_temperature( int id, double* refl_temperature);   
  //! Sets reflective temperature
  TESTO_IRAPI_EXPORT TESTO_IRAPI_RESULT testo_irimage_set_reflected_temperature( int id, double refl_temperature);   
  //! Returns humidity
  TESTO_IRAPI_EXPORT TESTO_IRAPI_RESULT testo_irimage_get_humidity( int id, double* humidity);   
  //! Sets humidity
  TESTO_IRAPI_EXPORT TESTO_IRAPI_RESULT testo_irimage_set_humidity( int id, double humidity);   
  
  //! Returns devicename - 'buffer' must be pre-allocated from user  
  TESTO_IRAPI_EXPORT TESTO_IRAPI_RESULT testo_irimage_get_devicename( int id, int length, wchar_t* text_buffer);   
  //! Returns device serial number  
  TESTO_IRAPI_EXPORT TESTO_IRAPI_RESULT testo_irimage_get_serialnumber( int id, unsigned int* serial);   
  //! Returns non-localized recording tim & date  
  TESTO_IRAPI_EXPORT TESTO_IRAPI_RESULT testo_irimage_get_datetime( int id
    ,int* year
    ,int* month
    ,int* day
    ,int* hour
    ,int* minute
    ,int* second
    );   
  //! Returns FOV  
  TESTO_IRAPI_EXPORT TESTO_IRAPI_RESULT testo_irimage_get_fov( int id, int* fov);   
  //! Returns the measurement range at recording time  
  TESTO_IRAPI_EXPORT TESTO_IRAPI_RESULT testo_irimage_get_measurement_range( int id, float* mmin, float* mmax);   
  
  //! Returns upper scale value  
  TESTO_IRAPI_EXPORT TESTO_IRAPI_RESULT testo_irimage_get_max_scale( int id, float* val);   
  //! Set upper scale value  
  TESTO_IRAPI_EXPORT TESTO_IRAPI_RESULT testo_irimage_set_max_scale( int id, float val);   
  //! Returns lower scale value  
  TESTO_IRAPI_EXPORT TESTO_IRAPI_RESULT testo_irimage_get_min_scale( int id, float* val);   
  //! Sets lower scale value  
  TESTO_IRAPI_EXPORT TESTO_IRAPI_RESULT testo_irimage_set_min_scale( int id, float val);   
  //! Returns upper limit temperature  
  TESTO_IRAPI_EXPORT TESTO_IRAPI_RESULT testo_irimage_get_upper_limit_temperature( int id, float* val);   
  //! Sets upper limit temperature  
  TESTO_IRAPI_EXPORT TESTO_IRAPI_RESULT testo_irimage_set_upper_limit_temperature( int id, float val);   
  //! Returns lower limit temperature  
  TESTO_IRAPI_EXPORT TESTO_IRAPI_RESULT testo_irimage_get_lower_limit_temperature( int id, float* val);   
  //! Sets lower limit temperature  
  TESTO_IRAPI_EXPORT TESTO_IRAPI_RESULT testo_irimage_set_lower_limit_temperature( int id, float val);   
  //! Returns upper limit of isotherme temperature interval  
  TESTO_IRAPI_EXPORT TESTO_IRAPI_RESULT testo_irimage_get_upper_iso_temperature( int id, float* val);   
  //! Sets upper limit of isotherme temperature interval
  TESTO_IRAPI_EXPORT TESTO_IRAPI_RESULT testo_irimage_set_upper_iso_temperature( int id, float val);   
  //! Returns lower limit of isotherme temperature interval
  TESTO_IRAPI_EXPORT TESTO_IRAPI_RESULT testo_irimage_get_lower_iso_temperature( int id, float* val);   
  //! Sets lower limit of isotherme temperature interval
  TESTO_IRAPI_EXPORT TESTO_IRAPI_RESULT testo_irimage_set_lower_iso_temperature( int id, float val);   
  //! Returns, whether limit temperatures are allowed or not  
  TESTO_IRAPI_EXPORT TESTO_IRAPI_RESULT testo_irimage_limits_applied( int id, int* val);   
  //! Set, whether limit temperatures are allowed or not
  TESTO_IRAPI_EXPORT TESTO_IRAPI_RESULT testo_irimage_apply_limits( int id, int val);   
  //! Returns, whether isotherm temperature limits are allowed or not
  TESTO_IRAPI_EXPORT TESTO_IRAPI_RESULT testo_irimage_iso_applied( int id, int* val);   
  //! Set, whether isotherm temperature limits are allowed or not
  TESTO_IRAPI_EXPORT TESTO_IRAPI_RESULT testo_irimage_apply_iso( int id, int val);   

  //! Returns unique filename for embedded visual image
  TESTO_IRAPI_EXPORT TESTO_IRAPI_RESULT testo_irimage_visual_image( int id, int length, wchar_t* path);   
  //! Returns unique filename for thermal image
  TESTO_IRAPI_EXPORT TESTO_IRAPI_RESULT testo_irimage_thermal_image( int id, TESTO_IRAPI_UNIT unit, int length, wchar_t* path);   
  //! Returns unique filename for thermal image with attached palette
  TESTO_IRAPI_EXPORT TESTO_IRAPI_RESULT testo_irimage_thermal_image_with_palette( int id, TESTO_IRAPI_UNIT unit, int length, wchar_t* path);   

  //! Returns temperature at position (x,y)
  TESTO_IRAPI_EXPORT TESTO_IRAPI_RESULT testo_irimage_get_temperature( int id, int x, int y, float* temperature);   
  //! Returns palette  
  TESTO_IRAPI_EXPORT TESTO_IRAPI_RESULT testo_irimage_get_palette( int id, TESTO_IRAPI_PALETTE* val);   
  //! Set palette  
  TESTO_IRAPI_EXPORT TESTO_IRAPI_RESULT testo_irimage_set_palette( int id, TESTO_IRAPI_PALETTE val);   

#ifdef __cplusplus
}
#endif