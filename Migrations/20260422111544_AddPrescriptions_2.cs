using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HospitalBilling.Migrations
{
    /// <inheritdoc />
    public partial class AddPrescriptions_2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Prescriptions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    BillId = table.Column<int>(type: "int", nullable: false),
                    DrugName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Dosage = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Frequency = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Duration = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    PrescribedByStaffId = table.Column<int>(type: "int", nullable: false),
                    PrescribedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DispensedByStaffId = table.Column<int>(type: "int", nullable: true),
                    DispensedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    BillItemId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Prescriptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Prescriptions_BillItems_BillItemId",
                        column: x => x.BillItemId,
                        principalTable: "BillItems",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Prescriptions_Bills_BillId",
                        column: x => x.BillId,
                        principalTable: "Bills",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Prescriptions_Staff_DispensedByStaffId",
                        column: x => x.DispensedByStaffId,
                        principalTable: "Staff",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Prescriptions_Staff_PrescribedByStaffId",
                        column: x => x.PrescribedByStaffId,
                        principalTable: "Staff",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Prescriptions_BillId",
                table: "Prescriptions",
                column: "BillId");

            migrationBuilder.CreateIndex(
                name: "IX_Prescriptions_BillItemId",
                table: "Prescriptions",
                column: "BillItemId");

            migrationBuilder.CreateIndex(
                name: "IX_Prescriptions_DispensedByStaffId",
                table: "Prescriptions",
                column: "DispensedByStaffId");

            migrationBuilder.CreateIndex(
                name: "IX_Prescriptions_PrescribedByStaffId",
                table: "Prescriptions",
                column: "PrescribedByStaffId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Prescriptions");
        }
    }
}
