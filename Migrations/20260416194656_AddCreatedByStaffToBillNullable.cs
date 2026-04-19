using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HospitalBilling.Migrations
{
    /// <inheritdoc />
    public partial class AddCreatedByStaffToBillNullable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CreatedByStaffId",
                table: "Bills",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Bills_CreatedByStaffId",
                table: "Bills",
                column: "CreatedByStaffId");

            migrationBuilder.AddForeignKey(
                name: "FK_Bills_Staff_CreatedByStaffId",
                table: "Bills",
                column: "CreatedByStaffId",
                principalTable: "Staff",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Bills_Staff_CreatedByStaffId",
                table: "Bills");

            migrationBuilder.DropIndex(
                name: "IX_Bills_CreatedByStaffId",
                table: "Bills");

            migrationBuilder.DropColumn(
                name: "CreatedByStaffId",
                table: "Bills");
        }
    }
}
