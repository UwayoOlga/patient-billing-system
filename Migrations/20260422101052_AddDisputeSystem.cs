using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HospitalBilling.Migrations
{
    /// <inheritdoc />
    public partial class AddDisputeSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AssignedDoctorId",
                table: "Bills",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Bills_AssignedDoctorId",
                table: "Bills",
                column: "AssignedDoctorId");

            migrationBuilder.AddForeignKey(
                name: "FK_Bills_Staff_AssignedDoctorId",
                table: "Bills",
                column: "AssignedDoctorId",
                principalTable: "Staff",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Bills_Staff_AssignedDoctorId",
                table: "Bills");

            migrationBuilder.DropIndex(
                name: "IX_Bills_AssignedDoctorId",
                table: "Bills");

            migrationBuilder.DropColumn(
                name: "AssignedDoctorId",
                table: "Bills");
        }
    }
}
