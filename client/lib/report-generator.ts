import { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, ImageRun, BorderStyle } from 'docx';
import { ThermalImage, Marker, Region, ThermalMetadata } from './thermal-utils';
import { Project } from './store';
import { Language } from './translations';

export interface ReportSettings {
  title: string;
  reportLanguage: Language;
  includeCompanyInfo: boolean;
  includeDeviceInfo: boolean;
  includeCustomerInfo: boolean;
  includeMeasuringSite: boolean;
  includeTask: boolean;
  includeBuildingDescription: boolean;
  includeWeatherConditions: boolean;
  includeImages: boolean;
  includeMarkers: boolean;
  includeRegions: boolean;
  includeParameters: boolean;

  // Custom fields based on PDF sample
  company: string;
  device: string;
  serialNumber: string;
  lens: string;
  customer: string;
  measuringSite: string;
  task: string;
  buildingDescription: string;
  construction: string;
  orientation: string;
  vicinity: string;

  // Weather conditions
  outerTempMin24h: string;
  outerTempMax24h: string;
  outerTempMinWhile: string;
  outerTempMaxWhile: string;
  solarRadiation12h: string;
  solarRadiationWhile: string;
  precipitation: string;
  windVelocity: string;
  windDirection: string;
  innerAirTemp: string;
  tempDifference: string;
  pressureDifference: string;
  furtherFactors: string;
  deviations: string;

  notes: string;
}

export interface ImageData {
  thermalBase64?: string;
  realBase64?: string;
  image: ThermalImage;
}

export class ReportGenerator {
  private settings: ReportSettings;
  private project: Project;
  private images: ImageData[];
  private markers: Marker[];
  private regions: Region[];
  private globalParameters: ThermalMetadata;

  constructor(
    settings: ReportSettings,
    project: Project,
    images: ImageData[],
    markers: Marker[],
    regions: Region[],
    globalParameters: ThermalMetadata
  ) {
    this.settings = settings;
    this.project = project;
    this.images = images;
    this.markers = markers;
    this.regions = regions;
    this.globalParameters = globalParameters;
  }

  private t(en: string, fa: string): string {
    return this.settings.reportLanguage === 'fa' ? fa : en;
  }

  private createHeaderSection(): Paragraph[] {
    const isRTL = this.settings.reportLanguage === 'fa';

    return [
      new Paragraph({
        text: this.settings.title,
        heading: HeadingLevel.HEADING_1,
        alignment: isRTL ? AlignmentType.RIGHT : AlignmentType.LEFT,
        spacing: { after: 300 },
        border: {
          bottom: {
            color: '000000',
            space: 1,
            style: BorderStyle.SINGLE,
            size: 20,
          },
        },
      }),
      new Paragraph({
        spacing: { after: 200 },
      }),
    ];
  }

  private createCompanySection(): Paragraph[] {
    if (!this.settings.includeCompanyInfo) return [];

    return [
      new Paragraph({
        text: this.t('Company', 'شرکت'),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 200 },
      }),
      new Paragraph({
        text: this.settings.company || '',
        spacing: { after: 300 },
      }),
    ];
  }

  private createDeviceInfoTable(): Table | null {
    if (!this.settings.includeDeviceInfo) return null;

    const isRTL = this.settings.reportLanguage === 'fa';

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: this.t('Device', 'دستگاه'), bold: true })],
              width: { size: 25, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [new Paragraph({ text: this.settings.device || '' })],
              width: { size: 25, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [new Paragraph({ text: this.t('Serial No.:', 'شماره سریال:'), bold: true })],
              width: { size: 25, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [new Paragraph({ text: this.settings.serialNumber || '' })],
              width: { size: 25, type: WidthType.PERCENTAGE },
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: this.t('Lens:', 'لنز:'), bold: true })],
            }),
            new TableCell({
              children: [new Paragraph({ text: this.settings.lens || '' })],
              columnSpan: 3,
            }),
          ],
        }),
      ],
    });
  }

  private createCustomerSection(): Paragraph[] {
    if (!this.settings.includeCustomerInfo) return [];

    return [
      new Paragraph({
        text: this.t('Customer', 'مشتری'),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 200 },
      }),
      new Paragraph({
        text: this.settings.customer || '',
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: this.t('Measuring Site: ', 'محل اندازه‌گیری: '), bold: true }),
          new TextRun({ text: this.settings.measuringSite || '' }),
        ],
        spacing: { after: 300 },
      }),
    ];
  }

  private createTaskSection(): Paragraph[] {
    if (!this.settings.includeTask) return [];

    return [
      new Paragraph({
        text: this.t('Task', 'وظیفه'),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 200 },
      }),
      new Paragraph({
        text: this.settings.task || this.t(
          'This examination was carried out according to EN 13187 using a thermal imager.',
          'این بازرسی مطابق با استاندارد EN 13187 با استفاده از دوربین حرارتی انجام شده است.'
        ),
        spacing: { after: 300 },
      }),
    ];
  }

  private createBuildingDescriptionSection(): Paragraph[] {
    if (!this.settings.includeBuildingDescription) return [];

    return [
      new Paragraph({
        text: this.t('Description of building:', 'توصیف ساختمان:'),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 200 },
      }),
      new Paragraph({
        text: this.settings.buildingDescription || '',
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: this.t('Construction: ', 'ساخت: '), bold: true }),
          new TextRun({ text: this.settings.construction || '' }),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: this.t('Orientation (direction): ', 'جهت: '), bold: true }),
          new TextRun({ text: this.settings.orientation || '' }),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: this.t('Vicinity: ', 'اطراف: '), bold: true }),
          new TextRun({ text: this.settings.vicinity || '' }),
        ],
        spacing: { after: 300 },
      }),
    ];
  }

  private createWeatherConditionsTable(): Table | null {
    if (!this.settings.includeWeatherConditions) return null;

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        // Header
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: this.t('Outer air temperature', 'دمای هوای خارج'), bold: true })],
              width: { size: 50, type: WidthType.PERCENTAGE },
              shading: { fill: 'E0E0E0' },
            }),
            new TableCell({
              children: [new Paragraph({ text: this.t('min', 'حداقل'), bold: true })],
              width: { size: 25, type: WidthType.PERCENTAGE },
              shading: { fill: 'E0E0E0' },
            }),
            new TableCell({
              children: [new Paragraph({ text: this.t('max', 'حداکثر'), bold: true })],
              width: { size: 25, type: WidthType.PERCENTAGE },
              shading: { fill: 'E0E0E0' },
            }),
          ],
        }),
        // 24h before measuring
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: this.t('24h before measuring', '24 ساعت قبل از اندازه‌گیری') })] }),
            new TableCell({ children: [new Paragraph({ text: this.settings.outerTempMin24h || '' })] }),
            new TableCell({ children: [new Paragraph({ text: this.settings.outerTempMax24h || '' })] }),
          ],
        }),
        // While measuring
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: this.t('While measuring', 'حین اندازه‌گیری') })] }),
            new TableCell({ children: [new Paragraph({ text: this.settings.outerTempMinWhile || '' })] }),
            new TableCell({ children: [new Paragraph({ text: this.settings.outerTempMaxWhile || '' })] }),
          ],
        }),
        // Solar radiation
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: this.t('Solar radiation', 'تابش خورشید'), bold: true })],
              columnSpan: 3,
              shading: { fill: 'E0E0E0' },
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: this.t('12h before measuring', '12 ساعت قبل') })] }),
            new TableCell({ children: [new Paragraph({ text: this.settings.solarRadiation12h || '' })], columnSpan: 2 }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: this.t('While measuring', 'حین اندازه‌گیری') })] }),
            new TableCell({ children: [new Paragraph({ text: this.settings.solarRadiationWhile || '' })], columnSpan: 2 }),
          ],
        }),
        // Other conditions
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: this.t('Precipitation', 'بارندگی') })] }),
            new TableCell({ children: [new Paragraph({ text: this.settings.precipitation || '' })], columnSpan: 2 }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: this.t('Wind velocity', 'سرعت باد') })] }),
            new TableCell({ children: [new Paragraph({ text: this.settings.windVelocity || '' })], columnSpan: 2 }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: this.t('Wind Direction', 'جهت باد') })] }),
            new TableCell({ children: [new Paragraph({ text: this.settings.windDirection || '' })], columnSpan: 2 }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: this.t('Inner air temperature', 'دمای هوای داخل') })] }),
            new TableCell({ children: [new Paragraph({ text: this.settings.innerAirTemp || '' })], columnSpan: 2 }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: this.t('Difference between inner and outer air temperature', 'اختلاف دمای داخل و خارج') })],
            }),
            new TableCell({ children: [new Paragraph({ text: this.settings.tempDifference || '' })], columnSpan: 2 }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: this.t('Pressure difference between downwind and wind-facing side', 'اختلاف فشار') })],
            }),
            new TableCell({ children: [new Paragraph({ text: this.settings.pressureDifference || '' })], columnSpan: 2 }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: this.t('Further factors', 'عوامل دیگر') })] }),
            new TableCell({ children: [new Paragraph({ text: this.settings.furtherFactors || '' })], columnSpan: 2 }),
          ],
        }),
      ],
    });
  }

  private createDeviationsSection(): Paragraph[] {
    if (!this.settings.includeWeatherConditions) return [];

    return [
      new Paragraph({
        text: this.t('Deviations from the stated test standards:', 'انحراف از استانداردهای تست:'),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 200 },
      }),
      new Paragraph({
        text: this.settings.deviations || '',
        spacing: { after: 300 },
      }),
    ];
  }

  private async createImagesSection(): Promise<(Paragraph | Table)[]> {
    if (!this.settings.includeImages || this.images.length === 0) return [];

    const elements: (Paragraph | Table)[] = [
      new Paragraph({
        text: this.t('Thermal Images', 'تصاویر حرارتی'),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 200 },
        pageBreakBefore: true,
      }),
    ];

    for (let idx = 0; idx < this.images.length; idx++) {
      const imgData = this.images[idx];
      const img = imgData.image;

      elements.push(
        new Paragraph({
          text: `${this.t('Image', 'تصویر')} ${idx + 1}: ${img.name}`,
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      );

      // Add thermal image if available
      if (imgData.thermalBase64) {
        try {
          const base64Data = imgData.thermalBase64.split(',')[1];
          elements.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: Buffer.from(base64Data, 'base64'),
                  transformation: {
                    width: 500,
                    height: 375,
                  },
                }),
              ],
              spacing: { after: 100 },
            })
          );
        } catch (error) {
          console.error('Error adding thermal image:', error);
        }
      }

      // Add real image if available
      if (imgData.realBase64) {
        try {
          const base64Data = imgData.realBase64.split(',')[1];
          elements.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: Buffer.from(base64Data, 'base64'),
                  transformation: {
                    width: 500,
                    height: 375,
                  },
                }),
              ],
              spacing: { after: 100 },
            })
          );
        } catch (error) {
          console.error('Error adding real image:', error);
        }
      }

      // Add image info table
      if (img.thermalData) {
        const imageInfoTable = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: this.t('File:', 'فایل:'), bold: true })] }),
                new TableCell({ children: [new Paragraph({ text: img.name })] }),
                new TableCell({ children: [new Paragraph({ text: this.t('Date:', 'تاریخ:'), bold: true })] }),
                new TableCell({ children: [new Paragraph({ text: new Date().toLocaleDateString() })] }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: this.t('Emissivity:', 'گسیل‌پذیری:'), bold: true })] }),
                new TableCell({ children: [new Paragraph({ text: this.globalParameters.emissivity.toFixed(2) })] }),
                new TableCell({ children: [new Paragraph({ text: this.t('Refl. temp.:', 'دمای بازتابی:'), bold: true })] }),
                new TableCell({
                  children: [new Paragraph({ text: `${this.globalParameters.reflectedTemperature.toFixed(1)}°C` })],
                }),
              ],
            }),
          ],
        });

        elements.push(imageInfoTable);

        // Add markers table for this image
        const imageMarkers = this.markers.filter(m => m.imageId === img.id);
        if (imageMarkers.length > 0) {
          elements.push(
            new Paragraph({
              text: this.t('Picture markings:', 'نشانگرهای تصویر:'),
              heading: HeadingLevel.HEADING_4,
              spacing: { before: 200, after: 100 },
            })
          );

          const markersTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: this.t('Measurement Objects', 'اشیاء اندازه‌گیری'), bold: true })],
                    shading: { fill: 'E0E0E0' },
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: this.t('Temp. [°C]', 'دما [°C]'), bold: true })],
                    shading: { fill: 'E0E0E0' },
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: this.t('Emiss.', 'گسیل‌پذیری'), bold: true })],
                    shading: { fill: 'E0E0E0' },
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: this.t('Refl. temp. [°C]', 'دمای بازتابی [°C]'), bold: true })],
                    shading: { fill: 'E0E0E0' },
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: this.t('Remarks', 'توضیحات'), bold: true })],
                    shading: { fill: 'E0E0E0' },
                  }),
                ],
              }),
              ...imageMarkers.map(
                (m, i) =>
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ text: m.label })] }),
                      new TableCell({ children: [new Paragraph({ text: m.temperature?.toFixed(1) || '-' })] }),
                      new TableCell({ children: [new Paragraph({ text: m.emissivity.toFixed(2) })] }),
                      new TableCell({ children: [new Paragraph({ text: this.globalParameters.reflectedTemperature.toFixed(1) })] }),
                      new TableCell({ children: [new Paragraph({ text: '-' })] }),
                    ],
                  })
              ),
            ],
          });

          elements.push(markersTable);
        }
      }

      elements.push(
        new Paragraph({
          spacing: { after: 300 },
        })
      );
    }

    return elements;
  }

  async generateWordDocument(): Promise<Document> {
    const isRTL = this.settings.reportLanguage === 'fa';

    const sections: (Paragraph | Table)[] = [
      ...this.createHeaderSection(),
      ...this.createCompanySection(),
    ];

    const deviceTable = this.createDeviceInfoTable();
    if (deviceTable) sections.push(deviceTable);

    sections.push(...this.createCustomerSection());
    sections.push(...this.createTaskSection());
    sections.push(...this.createBuildingDescriptionSection());

    sections.push(
      new Paragraph({
        text: this.t('Weather Conditions:', 'شرایط آب و هوایی:'),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 200 },
        pageBreakBefore: true,
      })
    );

    const weatherTable = this.createWeatherConditionsTable();
    if (weatherTable) sections.push(weatherTable);

    sections.push(...this.createDeviationsSection());

    // Add images
    const imageElements = await this.createImagesSection();
    sections.push(...imageElements);

    // Add notes
    if (this.settings.notes) {
      sections.push(
        new Paragraph({
          text: this.t('Additional Notes', 'یادداشت‌های اضافی'),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 200 },
        }),
        new Paragraph({
          text: this.settings.notes,
          spacing: { after: 300 },
        })
      );
    }

    // Footer
    sections.push(
      new Paragraph({
        text: new Date().toLocaleDateString(isRTL ? 'fa-IR' : 'en-US'),
        alignment: AlignmentType.CENTER,
        spacing: { before: 500 },
      })
    );

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: sections,
        },
      ],
    });

    return doc;
  }
}
