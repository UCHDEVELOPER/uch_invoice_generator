import { prisma } from "../../config/prismaClient.js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { parse } from "fast-csv";
import { createDriversCsv } from "../../utils/exportDriversCSV.js";
import { generateSlug } from "../../helpers/slugHelper.js";
import { validateObjectId } from "../../helpers/validator.js";
import XLSX from "xlsx";

dotenv.config();

export async function addDriverService(data) {
  try {
    const existingDriver = await prisma.selfDriver.findFirst({
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

    const result = await prisma.selfDriver.create({
      data: {
        name: data.name,
        sage_name: data.sage_name ?? null,
        call_sign: data.call_sign,
        driver_position_id: data.driver_position_id || null,
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
        vat_number: Number(data.vat_number) || 0,
        additional_charges_1: Number(data.additional_charges_1) || 0,
        additional_charges_2: Number(data.additional_charges_2) || 0,
        additional_charges_3: Number(data.additional_charges_3) || 0,
        additional_charges_vat_1_percent:
          Number(data.additional_charges_vat_1_percent) || 0,
        additional_charges_vat_2_percent:
          Number(data.additional_charges_vat_2_percent) || 0,
        additional_charges_vat_3_percent:
          Number(data.additional_charges_vat_3_percent) || 0,
        manual_dockets: data.manual_dockets || null,
        docket_total_vat_percent: Number(data.docket_total_vat_percent) || 0,
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
      prisma.selfDriver.findMany({
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
      prisma.selfDriver.count({ where }),
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
    const driver = await prisma.selfDriver.findUnique({
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
    const existingDriver = await prisma.selfDriver.findUnique({
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
      const callsignExists = await prisma.selfDriver.findFirst({
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

      newPosition = await prisma.selfDriverPosition.findUnique({
        where: { id: data.driver_position_id },
      });
    }

    // Convert numeric fields
    const numericFloatFields = [
      "vat_percent",
      "admin_fee",
      "vehicle_hire_charge",
      "insurance_charge",
      "fuel_charge",
      "vehicle_vat_percent",
      "insurance_vat_percent",
      "fuel_vat_percent",
      "vat_number",
      "additional_charges_1",
      "additional_charges_2",
      "additional_charges_3",
      "additional_charges_vat_1_percent",
      "additional_charges_vat_2_percent",
      "additional_charges_vat_3_percent",
      "docket_total_vat_percent",
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
      await prisma.selfDriverPositionHistory.create({
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

    const updated = await prisma.selfDriver.update({
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
    const existingDriver = await prisma.selfDriver.findUnique({
      where: { id },
    });

    if (!existingDriver) {
      return {
        success: false,
        statusCode: 404,
        message: "Driver not found",
      };
    }

    const invoiceCount = await prisma.selfInvoice.count({
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

    const deleted = await prisma.selfDriver.delete({ where: { id } });

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

    const allPositions = await prisma.selfDriverPosition.findMany({
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
          const newPosition = await prisma.selfDriverPosition.create({
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
      if (row.Sagename?.toString().trim())
        payload.sage_name = row.Sagename.toString().trim();
      if (row.CallSign?.toString().trim())
        payload.call_sign = row.CallSign.toString().trim();
      if (row.PayrollID?.toString().trim())
        payload.payroll_id = row.PayrollID.toString().trim();
      if (row.BankAccountNumber?.toString().trim())
        payload.bank_account_no = row.BankAccountNumber.toString().trim();
      if (row.PaymentReference?.toString().trim())
        payload.payment_reference = row.PaymentReference.toString().trim();
      if (row.SortCode?.toString().trim())
        payload.iban_no = row.SortCode.toString().trim();
      if (row.Address?.toString().trim())
        payload.address_details = row.Address.toString().trim();
      if (row.Phone !== undefined && row.Phone !== null) {
        const phone = String(row.Phone).trim();
        if (phone.length > 0) {
          payload.phone_number = phone;
        }
      }
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
      if (row.VATNumber !== "N/A" && row.VATNumber !== "")
        payload.vat_number = Number(row.VATNumber);
      if (row.AdditionalDetails1 != null && row.AdditionalDetails1 !== "")
        payload.additional_charges_1 = Number(row.AdditionalDetails1);
      if (row.AdditionalDetails2 != null && row.AdditionalDetails2 !== "")
        payload.additional_charges_2 = Number(row.AdditionalDetails2);
      if (row.AdditionalDetails3 != null && row.AdditionalDetails3 !== "")
        payload.additional_charges_3 = Number(row.AdditionalDetails3);
      if (
        row.AdditionalDetails1VATPercentage != null &&
        row.AdditionalDetails1VATPercentage !== ""
      )
        payload.additional_charges_vat_1_percent = Number(
          row.AdditionalDetails1VATPercentage,
        );
      if (
        row.AdditionalDetails2VATPercentage != null &&
        row.AdditionalDetails2VATPercentage !== ""
      )
        payload.additional_charges_vat_2_percent = Number(
          row.AdditionalDetails2VATPercentage,
        );
      if (
        row.AdditionalDetails3VATPercentage != null &&
        row.AdditionalDetails3VATPercentage !== ""
      )
        payload.additional_charges_vat_3_percent = Number(
          row.AdditionalDetails3VATPercentage,
        );
      if (row.CarryForwardAdminFee != null && row.CarryForwardAdminFee !== "")
        payload.carry_forward_admin_fee = Number(row.CarryForwardAdminFee);
      if (
        row.CarryForwardAdminVATPercentage != null &&
        row.CarryForwardAdminVATPercentage !== ""
      )
        payload.carry_forward_admin_vat_percent = Number(
          row.CarryForwardAdminVATPercentage,
        );
      if (
        row.CarryForwardVehicleHireCharge != null &&
        row.CarryForwardVehicleHireCharge !== ""
      )
        payload.carry_forward_vehicle_hire_charge = Number(
          row.CarryForwardVehicleHireCharge,
        );
      if (
        row.CarryForwardVehicleVATPercentage != null &&
        row.CarryForwardVehicleVATPercentage !== ""
      )
        payload.carry_forward_vehicle_vat_percent = Number(
          row.CarryForwardVehicleVATPercentage,
        );
      if (
        row.CarryForwardInsuranceCharge != null &&
        row.CarryForwardInsuranceCharge !== ""
      )
        payload.carry_forward_insurance_charge = Number(
          row.CarryForwardInsuranceCharge,
        );
      if (
        row.CarryForwardInsuranceVATPercentage != null &&
        row.CarryForwardInsuranceVATPercentage !== ""
      )
        payload.carry_forward_insurance_vat_percent = Number(
          row.CarryForwardInsuranceVATPercentage,
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
          row.CarryForwardFuelVATPercentage,
        );
      if (
        row.DocketTotalVATPercentage != null &&
        row.DocketTotalVATPercentage !== ""
      )
        payload.docket_total_vat_percent = Number(row.DocketTotalVATPercentage);
      if (row.ManualDockets?.toString().trim()) {
        payload.manual_dockets = row.ManualDockets.toString()
          .split("|")
          .map((item) => item.trim())
          .filter(Boolean)
          .map((item) => {
            const parts = item.split(":");

            if (parts.length !== 2) {
              return null;
            }

            const docket_no = parts[0]?.trim();
            const driver_total = Number(parts[1]?.trim()) || 0;

            if (!docket_no) {
              return null;
            }

            return {
              docket_no,
              driver_total,
            };
          })
          .filter(Boolean);
      }

      payload.status = "active";

      const rawCallSign = row.CallSign?.toString().trim();
      const callSign = rawCallSign.toUpperCase();

      const existingDriver = await prisma.selfDriver.findFirst({
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
          await prisma.selfDriverPositionHistory.create({
            data: {
              driver_id: existingDriver.id,
              old_position_id: existingDriver.driver_position_id || null,
              new_position_id: driver_position_id,
            },
          });
        }

        await prisma.selfDriver.update({
          where: { id: existingDriver.id },
          data: payload,
        });
        updated++;
      } else {
        await prisma.selfDriver.create({ data: payload });
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

export async function getAllDriverPositionsService() {
  try {
    // Also Get the count of drivers assigned to each position
    const positions = await prisma.selfDriverPosition.findMany({
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
    const position = await prisma.selfDriverPosition.findUnique({
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
    const existingBySlug = await prisma.selfDriverPosition.findUnique({
      where: { slug: finalSlug },
    });

    if (existingBySlug) {
      return {
        success: false,
        statusCode: 409,
        message: `Driver position with slug "${finalSlug}" already exists`,
      };
    }

    const position = await prisma.selfDriverPosition.create({
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
    const existing = await prisma.selfDriverPosition.findUnique({
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
      const slugTaken = await prisma.selfDriverPosition.findUnique({
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

      const slugTaken = await prisma.selfDriverPosition.findUnique({
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

    const updatedPosition = await prisma.selfDriverPosition.update({
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
    const existing = await prisma.selfDriverPosition.findUnique({
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

    await prisma.selfDriverPosition.delete({
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
