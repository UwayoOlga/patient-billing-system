using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HospitalBilling.Migrations
{
    /// <inheritdoc />
    public partial class UpdateStaffTableSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Username",
                table: "Staff",
                newName: "Email");

            migrationBuilder.RenameIndex(
                name: "IX_Staff_Username",
                table: "Staff",
                newName: "IX_Staff_Email");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Email",
                table: "Staff",
                newName: "Username");

            migrationBuilder.RenameIndex(
                name: "IX_Staff_Email",
                table: "Staff",
                newName: "IX_Staff_Username");
        }
    }
}
