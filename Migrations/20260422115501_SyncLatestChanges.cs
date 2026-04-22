using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HospitalBilling.Migrations
{
    /// <inheritdoc />
    public partial class SyncLatestChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CompletedByStaffId",
                table: "BillItems",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_BillItems_CompletedByStaffId",
                table: "BillItems",
                column: "CompletedByStaffId");

            migrationBuilder.AddForeignKey(
                name: "FK_BillItems_Staff_CompletedByStaffId",
                table: "BillItems",
                column: "CompletedByStaffId",
                principalTable: "Staff",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_BillItems_Staff_CompletedByStaffId",
                table: "BillItems");

            migrationBuilder.DropIndex(
                name: "IX_BillItems_CompletedByStaffId",
                table: "BillItems");

            migrationBuilder.DropColumn(
                name: "CompletedByStaffId",
                table: "BillItems");
        }
    }
}
