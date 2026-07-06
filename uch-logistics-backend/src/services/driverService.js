import { prisma } from "../config/prismaClient.js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { parse } from "fast-csv";
import { createDriversCsv } from "../utils/exportDriversCSV.js";
import { generateSlug } from "../helpers/slugHelper.js";
import { validateObjectId } from "../helpers/validator.js";
import XLSX from "xlsx";

dotenv.config();

export async function addDriverService(data) {
  try {
    const existingDriver = await prisma.driver.findFirst({
      where: {
        OR: [
          {
            call_sign: {
              equals: data.call_sign.trim(),
              mode: "insensitive",
            },
          },
          {
            email: {
              equals: data.email.trim(),
              mode: "insensitive",
            },
          },
        ],
      },
    });

    if (existingDriver) {
      if (
        existingDriver.call_sign?.toLowerCase() ===
        data.call_sign.trim().toLowerCase()
      ) {
        return {
          success: false,
          statusCode: 400,
          message: "Driver with this call sign already exists",
        };
      }

      if (
        existingDriver.email?.toLowerCase() === data.email.trim().toLowerCase()
      ) {
        return {
          success: false,
          statusCode: 400,
          message: "Driver with this email already exists",
        };
      }
    }

    const positionValidation = validateObjectId(data.driver_position_id);

    if (!positionValidation) {
      return {
        success: false,
        statusCode: 400,
        message: "Invalid driver position ID",
      };
    }

    const result = await prisma.driver.create({
      data: {
        name: data.name,
        sage_name: data.sage_name ?? null,
        call_sign: data.call_sign,
        driver_position_id: data.driver_position_id || null,
        per_hour_rate: data.per_hour_rate ? Number(data.per_hour_rate) : null,
        total_hours: data.total_hours ? Number(data.total_hours) : null,
        weekly_fixed_rate: data.weekly_fixed_rate
          ? Number(data.weekly_fixed_rate)
          : null,
        total_days: data.total_days ? Number(data.total_days) : null,
        bank_account_no: data.bank_account_no || null,
        iban_no: data.iban_no || null,
        payment_reference: data.payment_reference || null,
        address_details: data.address_details || null,
        phone_number: data.phone_number || null,
        email: data.email || null,
        status: data.status || "active",
        zip_code: data.zip_code || null,
        image: data.image || null,
        payroll_id: data.payroll_id || null,
        bank_user_name: data.bank_user_name || null,
        vat_percent: Number(data.vat_percent) || 0,
        admin_fee: Number(data.admin_fee) || 0,
        vehicle_hire_charge: Number(data.vehicle_hire_charge) || 0,
        vehicle_vat_percent: Number(data.vehicle_vat_percent) || 0,
        insurance_charge: Number(data.insurance_charge) || 0,
        insurance_vat_percent: Number(data.insurance_vat_percent) || 0,
        fuel_charge: Number(data.fuel_charge) || 0,
        fuel_vat_percent: Number(data.fuel_vat_percent) || 0,
        shift_type: data.shift_type,
        carry_forward_admin_fee: Number(data.carry_forward_admin_fee) || 0,
        carry_forward_admin_vat_percent:
          Number(data.carry_forward_admin_vat_percent) || 0,
        carry_forward_vehicle_hire_charge:
          Number(data.carry_forward_vehicle_hire_charge) || 0,
        carry_forward_vehicle_vat_percent:
          Number(data.carry_forward_vehicle_vat_percent) || 0,
        carry_forward_insurance_charge:
          Number(data.carry_forward_insurance_charge) || 0,
        carry_forward_insurance_vat_percent:
          Number(data.carry_forward_insurance_vat_percent) || 0,
        carry_forward_fuel_charge: Number(data.carry_forward_fuel_charge) || 0,
        carry_forward_fuel_vat_percent:
          Number(data.carry_forward_fuel_vat_percent) || 0,
      },
      include: {
        driver_position: true,
      },
    });

    return {
      success: true,
      statusCode: 201,
      message: "Driver added successfully",
      data: result,
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 500,
      message: err.message,
    };
  }
}

export async function getAllDriversService({ limit, page, search }) {
  try {
    const hasSearch = !!search;

    const safeLimit = Math.max(Number(limit) || 10, 1);
    const effectivePage = hasSearch ? 1 : Math.max(Number(page) || 1, 1);
    const skip = (effectivePage - 1) * safeLimit;

    const where = hasSearch
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { call_sign: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            {
              driver_position: {
                label: { contains: search, mode: "insensitive" },
              },
            },
          ],
        }
      : {};

    const [drivers, totalCount] = await Promise.all([
      prisma.driver.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          driver_position: {
            select: {
              id: true,
              label: true,
              slug: true,
              max_weight: true,
            },
          },
        },
      }),
      prisma.driver.count({ where }),
    ]);

    const mappedDrivers = drivers.map((driver) => {
      // Append base URL to image if exists
      const image =
        driver.image !== null
          ? process.env.BACKEND_BASE_URL + driver.image
          : null;

      return {
        ...driver,
        image,
        // Backward compatibility: flatten position label
        position: driver.driver_position?.label || null,
      };
    });

    return {
      success: true,
      statusCode: 200,
      message: "Drivers fetched successfully",
      data: mappedDrivers,
      pagination: {
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        limit,
      },
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 500,
      message: err.message,
    };
  }
}

export async function getDriverService(id) {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id },
      include: {
        driver_position: {
          select: {
            id: true,
            label: true,
            slug: true,
            max_weight: true,
          },
        },
        driver_history: {
          orderBy: { created_at: "desc" },
        },
      },
    });

    if (!driver) {
      return {
        success: false,
        statusCode: 404,
        message: "Driver not found",
      };
    }

    // Append base URL to image
    const image =
      driver.image !== null
        ? process.env.BACKEND_BASE_URL + driver.image
        : null;

    const driverData = {
      ...driver,
      image,
      // Backward compatibility: flatten position label
      position: driver.driver_position?.label || null,
    };

    return {
      success: true,
      statusCode: 200,
      message: "Driver fetched successfully",
      data: driverData,
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 500,
      message: err.message,
    };
  }
}

export async function updateDriverService(id, data) {
  try {
    const existingDriver = await prisma.driver.findUnique({
      where: { id },
      include: {
        driver_position: true,
      },
    });

    if (!existingDriver) {
      return {
        success: false,
        statusCode: 404,
        message: "Driver not found",
      };
    }

    // Check call_sign uniqueness
    if (
      data.call_sign &&
      data.call_sign.toLowerCase() !== existingDriver.call_sign?.toLowerCase()
    ) {
      const callsignExists = await prisma.driver.findFirst({
        where: {
          call_sign: {
            equals: data.call_sign,
            mode: "insensitive",
          },
          NOT: {
            id: id,
          },
        },
      });

      if (callsignExists) {
        return {
          success: false,
          statusCode: 400,
          message: "Call sign is already assigned",
        };
      }
    }

    let newPosition = null;

    if (
      data.driver_position_id !== undefined &&
      data.driver_position_id !== null
    ) {
      const positionValidation = validateObjectId(data.driver_position_id);

      if (!positionValidation) {
        return {
          success: false,
          statusCode: 400,
          message: "Invalid driver position id",
        };
      }

      newPosition = await prisma.driverPosition.findUnique({
        where: { id: data.driver_position_id },
      });
    }

    // Convert numeric fields
    const numericFloatFields = [
      "per_hour_rate",
      "total_hours",
      "weekly_fixed_rate",
      "vat_percent",
      "admin_fee",
      "vehicle_hire_charge",
      "insurance_charge",
      "fuel_charge",
      "vehicle_vat_percent",
      "insurance_vat_percent",
      "fuel_vat_percent",
      "carry_forward_admin_fee",
      "carry_forward_admin_vat_percent",
      "carry_forward_vehicle_hire_charge",
      "carry_forward_vehicle_vat_percent",
      "carry_forward_insurance_charge",
      "carry_forward_insurance_vat_percent",
      "carry_forward_fuel_charge",
      "carry_forward_fuel_vat_percent",
    ];

    const numericIntFields = ["total_days"];

    numericFloatFields.forEach((field) => {
      if (data[field] !== undefined && data[field] !== null) {
        data[field] = Number(data[field]);
      }
    });

    numericIntFields.forEach((field) => {
      if (data[field] !== undefined && data[field] !== null) {
        data[field] = parseInt(data[field], 10);
      }
    });

    const updatePayload = { ...data };

    delete updatePayload.position;

    if (data.per_hour_rate !== null && data.per_hour_rate !== undefined) {
      updatePayload.weekly_fixed_rate = null;
      updatePayload.total_days = null;
    }

    if (
      data.weekly_fixed_rate !== null &&
      data.weekly_fixed_rate !== undefined
    ) {
      updatePayload.per_hour_rate = null;
      updatePayload.total_hours = null;
    }

    if (data.image && existingDriver.image) {
      const oldImagePath = path.join(
        process.cwd(),
        "src",
        existingDriver.image.replace("/public/uploads/", "public/uploads/"),
      );

      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    const positionChanged =
      data.driver_position_id !== undefined &&
      data.driver_position_id !== existingDriver.driver_position_id;

    if (positionChanged) {
      await prisma.driverPositionHistory.create({
        data: {
          driver_id: existingDriver.id,
          old_position_id: existingDriver.driver_position_id || null,
          old_position_label: existingDriver.driver_position?.label || null,
          new_position_id: data.driver_position_id || null,
          new_position_label: newPosition?.label || null,
        },
      });
    }

    updatePayload.updated_at = new Date();

    const updated = await prisma.driver.update({
      where: { id },
      data: updatePayload,
      include: {
        driver_position: true,
      },
    });

    return {
      success: true,
      statusCode: 200,
      message: "Driver updated successfully",
      data: updated,
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 500,
      message: err.message,
    };
  }
}

export async function deleteDriverService(id) {
  try {
    const existingDriver = await prisma.driver.findUnique({ where: { id } });

    if (!existingDriver) {
      return {
        success: false,
        statusCode: 404,
        message: "Driver not found",
      };
    }

    const invoiceCount = await prisma.invoice.count({
      where: { driver_id: id },
    });

    if (invoiceCount > 0) {
      return {
        success: false,
        statusCode: 400,
        message:
          "Cannot delete driver. Invoices are associated with this driver.",
      };
    }

    const deleted = await prisma.driver.delete({ where: { id } });

    return {
      success: true,
      statusCode: 200,
      message: "Driver deleted successfully",
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 500,
      message: err.message,
    };
  }
}

export async function importDriversService(file) {
  try {
    if (!file) {
      return {
        success: false,
        statusCode: 400,
        message: "CSV or XLSX file is required",
      };
    }

    const rows = [];
    const fileExt = file.originalname?.split(".").pop()?.toLowerCase();

    if (fileExt === "xlsx" || fileExt === "xls") {
      const workbook = XLSX.readFile(file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null });
      rows.push(...jsonData);
    } else {
      const stream = fs.createReadStream(file.path);
      await new Promise((resolve, reject) => {
        stream
          .pipe(parse({ headers: true, trim: true }))
          .on("error", reject)
          .on("data", (row) => rows.push(row))
          .on("end", resolve);
      });
    }

    if (!rows.length) {
      return {
        success: false,
        statusCode: 400,
        message: "File is empty",
      };
    }

    const allPositions = await prisma.driverPosition.findMany({
      select: { id: true, slug: true },
    });

    const positionMap = {};
    for (const pos of allPositions) {
      positionMap[pos.slug.toLowerCase().trim()] = pos.id;
    }

    const normalizePosition = (raw) =>
      raw?.toString().toLowerCase().trim().replace(/\s+/g, "-");

    let created = 0;
    let updated = 0;

    for (const [i, row] of rows.entries()) {
      if (!row.CallSign) continue;

      let driver_position_id = undefined;
      if (row.Position) {
        const slug = normalizePosition(row.Position);

        if (positionMap[slug]) {
          driver_position_id = positionMap[slug];
        } else {
          const newPosition = await prisma.driverPosition.create({
            data: {
              slug,
              label: row.Position.toString().trim(),
            },
          });

          positionMap[slug] = newPosition.id;
          driver_position_id = newPosition.id;
        }
      }

      // Build payload only with fields that have actual values
      const payload = {};

      if (row.Name?.toString().trim())
        payload.name = row.Name.toString().trim();
      if (row.SageName?.toString().trim())
        payload.sage_name = row.SageName.toString().trim();
      if (row.CallSign?.toString().trim())
        payload.call_sign = row.CallSign.toString().trim();
      if (row.HourlyRate != null && row.HourlyRate !== "")
        payload.per_hour_rate = Number(row.HourlyRate);
      if (row.TotalHours != null && row.TotalHours !== "")
        payload.total_hours = Number(row.TotalHours);
      if (row.PayrollID?.toString().trim())
        payload.payroll_id = row.PayrollID.toString().trim();
      if (row.BankAccountNo?.toString().trim())
        payload.bank_account_no = row.BankAccountNo.toString().trim();
      if (row.PaymentReference?.toString().trim())
        payload.payment_reference = row.PaymentReference.toString().trim();
      if (row.SortCode?.toString().trim())
        payload.iban_no = row.SortCode.toString().trim();
      if (row.Address?.toString().trim())
        payload.address_details = row.Address.toString().trim();
      if (row.PhoneNumber?.toString().trim())
        payload.phone_number = row.PhoneNumber.toString().trim();
      if (row.Email?.toString().trim())
        payload.email = row.Email.toString().trim();
      if (row.PostCode?.toString().trim())
        payload.zip_code = row.PostCode.toString().trim();
      if (row.BankUserName?.toString().trim())
        payload.bank_user_name = row.BankUserName.toString().trim();
      if (row.AdminVATPercentage != null && row.AdminVATPercentage !== "")
        payload.vat_percent = Number(row.AdminVATPercentage);
      if (row.AdminFee != null && row.AdminFee !== "")
        payload.admin_fee = Number(row.AdminFee);
      if (row.VehicleHireCharge != null && row.VehicleHireCharge !== "")
        payload.vehicle_hire_charge = Number(row.VehicleHireCharge);
      if (row.VehicleVATPercentage != null && row.VehicleVATPercentage !== "")
        payload.vehicle_vat_percent = Number(row.VehicleVATPercentage);
      if (row.InsuranceCharge != null && row.InsuranceCharge !== "")
        payload.insurance_charge = Number(row.InsuranceCharge);
      if (
        row.InsuranceVATPercentage != null &&
        row.InsuranceVATPercentage !== ""
      )
        payload.insurance_vat_percent = Number(row.InsuranceVATPercentage);
      if (row.FuelCharge != null && row.FuelCharge !== "")
        payload.fuel_charge = Number(row.FuelCharge);
      if (row.FuelVATPercentage != null && row.FuelVATPercentage !== "")
        payload.fuel_vat_percent = Number(row.FuelVATPercentage);
      if (row.ShiftType?.toString().trim())
        payload.shift_type = row.ShiftType.toString().trim();
      if (driver_position_id !== undefined)
        payload.driver_position_id = driver_position_id;
      if (row.CarryForwardAdminFee != null && row.CarryForwardAdminFee !== "")
        payload.carry_forward_admin_fee = Number(row.CarryForwardAdminFee);
      if (
        row.CarryForwardAdminVATPercentage != null &&
        row.CarryForwardAdminVATPercentage !== ""
      )
        payload.carry_forward_admin_vat_percent = Number(
          row.CarryForwardAdminVATPercentage
        );
      if (
        row.CarryForwardVehicleHireCharge != null &&
        row.CarryForwardVehicleHireCharge !== ""
      )
        payload.carry_forward_vehicle_hire_charge = Number(
          row.CarryForwardVehicleHireCharge
        );
      if (
        row.CarryForwardVehicleVATPercentage != null &&
        row.CarryForwardVehicleVATPercentage !== ""
      )
        payload.carry_forward_vehicle_vat_percent = Number(
          row.CarryForwardVehicleVATPercentage
        );
      if (
        row.CarryForwardInsuranceCharge != null &&
        row.CarryForwardInsuranceCharge !== ""
      )
        payload.carry_forward_insurance_charge = Number(
          row.CarryForwardInsuranceCharge
        );
      if (
        row.CarryForwardInsuranceVATPercentage != null &&
        row.CarryForwardInsuranceVATPercentage !== ""
      )
        payload.carry_forward_insurance_vat_percent = Number(
          row.CarryForwardInsuranceVATPercentage
        );
      if (
        row.CarryForwardFuelCharge != null &&
        row.CarryForwardFuelCharge !== ""
      )
        payload.carry_forward_fuel_charge = Number(row.CarryForwardFuelCharge);
      if (
        row.CarryForwardFuelVATPercentage != null &&
        row.CarryForwardFuelVATPercentage !== ""
      )
        payload.carry_forward_fuel_vat_percent = Number(
          row.CarryForwardFuelVATPercentage
        );

      payload.status = "active";

      const rawCallSign = row.CallSign?.toString().trim();
      const callSign = rawCallSign.toUpperCase();

      const existingDriver = await prisma.driver.findFirst({
        where: {
          call_sign: {
            equals: callSign,
            mode: "insensitive",
          },
        },
      });

      if (existingDriver) {
        if (
          driver_position_id !== undefined &&
          existingDriver.driver_position_id !== driver_position_id
        ) {
          await prisma.driverPositionHistory.create({
            data: {
              driver_id: existingDriver.id,
              old_position_id: existingDriver.driver_position_id || null,
              new_position_id: driver_position_id,
            },
          });
        }

        await prisma.driver.update({
          where: { id: existingDriver.id },
          data: payload,
        });
        updated++;
      } else {
        await prisma.driver.create({ data: payload });
        created++;
      }
    }

    fs.unlinkSync(file.path);

    return {
      success: true,
      statusCode: 200,
      message: "Drivers imported successfully",
      data: {
        total: rows.length,
        created,
        updated,
      },
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 500,
      message: err.message,
    };
  }
}

// export async function exportDriversService() {
//   try {
//     const drivers = await prisma.driver.findMany({
//       select: {
//         id: true,
//         name: true,
//         call_sign: true,
//         driver_position: {
//           select: {
//             id: true,
//             label: true,
//           },
//         },
//         shift_type: true,
//         per_hour_rate: true,
//         weekly_fixed_rate: true,
//         total_hours: true,
//         total_days: true,
//         vat_percent: true,
//         admin_fee: true,
//         vehicle_hire_charge: true,
//         insurance_charge: true,
//         fuel_charge: true,
//         bank_user_name: true,
//         bank_account_no: true,
//         iban_no: true,
//         payment_reference: true,
//         email: true,
//         phone_number: true,
//         address_details: true,
//         zip_code: true,
//         payroll_id: true,
//         status: true,
//         created_at: true,
//       },
//       orderBy: { created_at: "desc" },
//     });

//     const mappedDrivers = drivers.map((driver) => ({
//       id: driver.id,
//       name: driver.name,
//       call_sign: driver.call_sign,
//       position: driver.driver_position?.label || "",
//       shift_type: driver.shift_type,
//       per_hour_rate: driver.per_hour_rate,
//       weekly_fixed_rate: driver.weekly_fixed_rate,
//       total_hours: driver.total_hours,
//       total_days: driver.total_days,
//       vat_percent: driver.vat_percent,
//       admin_fee: driver.admin_fee,
//       vehicle_hire_charge: driver.vehicle_hire_charge,
//       insurance_charge: driver.insurance_charge,
//       fuel_charge: driver.fuel_charge,
//       bank_user_name: driver.bank_user_name,
//       bank_account_no: driver.bank_account_no,
//       iban_no: driver.iban_no,
//       payment_reference: driver.payment_reference,
//       email: driver.email,
//       phone_number: driver.phone_number,
//       address_details: driver.address_details,
//       zip_code: driver.zip_code,
//       payroll_id: driver.payroll_id,
//       status: driver.status,
//       created_at: driver.created_at,
//     }));

//     const csvResult = createDriversCsv({ drivers: mappedDrivers });

//     return {
//       success: true,
//       statusCode: 200,
//       message: "Drivers exported successfully",
//       ...csvResult,
//     };
//   } catch (err) {
//     return {
//       success: false,
//       statusCode: 500,
//       message: err.message,
//     };
//   }
// }

export async function getAllDriverPositionsService() {
  try {
    // Also Get the count of drivers assigned to each position
    const positions = await prisma.driverPosition.findMany({
      include: {
        _count: {
          select: {
            drivers: true,
          },
        },
      },
    });
    return {
      success: true,
      statusCode: 200,
      message: "Driver positions fetched successfully",
      data: positions,
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 500,
      message: err.message,
    };
  }
}

export async function getDriverPositionService(id) {
  try {
    const position = await prisma.driverPosition.findUnique({
      where: { id },
      include: {
        drivers: true,
      },
    });

    if (!position) {
      return {
        success: false,
        statusCode: 404,
        message: "Driver position not found",
      };
    }

    return {
      success: true,
      statusCode: 200,
      message: "Driver position fetched successfully",
      data: position,
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 500,
      message: err.message,
    };
  }
}

export async function addDriverPositionService(body) {
  try {
    const { label, slug, max_weight } = body;

    // Generate slug from label if not provided
    const finalSlug = slug ? slug.trim().toLowerCase() : generateSlug(label);

    // Check if slug already exists
    const existingBySlug = await prisma.driverPosition.findUnique({
      where: { slug: finalSlug },
    });

    if (existingBySlug) {
      return {
        success: false,
        statusCode: 409,
        message: `Driver position with slug "${finalSlug}" already exists`,
      };
    }

    const position = await prisma.driverPosition.create({
      data: {
        label: label.trim(),
        slug: finalSlug,
        max_weight: max_weight !== undefined ? max_weight : null,
      },
    });

    return {
      success: true,
      statusCode: 201,
      message: "Driver position created successfully",
      data: position,
    };
  } catch (err) {
    // Handle Prisma unique constraint error
    if (err.code === "P2002") {
      return {
        success: false,
        statusCode: 409,
        message: "A driver position with this slug already exists",
      };
    }

    return {
      success: false,
      statusCode: 500,
      message: err.message,
    };
  }
}

export async function updateDriverPositionService(id, body) {
  try {
    // Check if position exists
    const existing = await prisma.driverPosition.findUnique({
      where: { id },
    });

    if (!existing) {
      return {
        success: false,
        statusCode: 404,
        message: "Driver position not found",
      };
    }

    // Build update data dynamically (only include provided fields)
    const updateData = {};

    if (body.label !== undefined) {
      updateData.label = body.label.trim();
    }

    if (body.slug !== undefined) {
      const newSlug = body.slug.trim().toLowerCase();

      // Check if slug is taken by a DIFFERENT position
      const slugTaken = await prisma.driverPosition.findUnique({
        where: { slug: newSlug },
      });

      if (slugTaken && slugTaken.id !== id) {
        return {
          success: false,
          statusCode: 409,
          message: `Driver position with slug "${newSlug}" already exists`,
        };
      }

      updateData.slug = newSlug;
    }

    // If label is updated but slug is not provided, regenerate slug
    if (body.label !== undefined && body.slug === undefined) {
      const newSlug = generateSlug(body.label);

      const slugTaken = await prisma.driverPosition.findUnique({
        where: { slug: newSlug },
      });

      if (slugTaken && slugTaken.id !== id) {
        // Append a short suffix to avoid collision
        updateData.slug = `${newSlug}-${id.slice(-4)}`;
      } else {
        updateData.slug = newSlug;
      }
    }

    if (body.max_weight !== undefined) {
      updateData.max_weight = body.max_weight === null ? null : body.max_weight;
    }

    // If nothing to update
    if (Object.keys(updateData).length === 0) {
      return {
        success: false,
        statusCode: 400,
        message: "No valid fields provided for update",
      };
    }

    const updatedPosition = await prisma.driverPosition.update({
      where: { id },
      data: updateData,
    });

    return {
      success: true,
      statusCode: 200,
      message: "Driver position updated successfully",
      data: updatedPosition,
    };
  } catch (err) {
    if (err.code === "P2002") {
      return {
        success: false,
        statusCode: 409,
        message: "A driver position with this slug already exists",
      };
    }

    return {
      success: false,
      statusCode: 500,
      message: err.message,
    };
  }
}

export async function deleteDriverPositionService(id) {
  try {
    const existing = await prisma.driverPosition.findUnique({
      where: { id },
      include: {
        _count: {
          select: { drivers: true },
        },
      },
    });

    if (!existing) {
      return {
        success: false,
        statusCode: 404,
        message: "Driver position not found",
      };
    }

    if (existing._count.drivers > 0) {
      return {
        success: false,
        statusCode: 400,
        message: `Cannot delete this position. ${existing._count.drivers} driver(s) are currently assigned to it. Reassign them first.`,
      };
    }

    await prisma.driverPosition.delete({
      where: { id },
    });

    return {
      success: true,
      statusCode: 200,
      message: "Driver position deleted successfully",
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 500,
      message: err.message,
    };
  }
}

export async function deleteCarryForwardService(id) {
  const carryForward = await prisma.driverCarryForward.findUnique({
    where: { id },
  });

  if (!carryForward) {
    return {
      success: false,
      statusCode: 404,
      message: "Carry-forward not found",
    };
  }

  if (carryForward.status === "APPLIED") {
    return {
      success: false,
      statusCode: 400,
      message: "Applied carry-forward cannot be deleted",
    };
  }

  await prisma.driverCarryForward.delete({
    where: { id },
  });

  return {
    success: true,
    statusCode: 200,
    message: "Carry-forward deleted successfully",
  };
}
