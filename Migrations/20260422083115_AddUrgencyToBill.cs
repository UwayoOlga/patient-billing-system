using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HospitalBilling.Migrations
{
    /// <inheritdoc />
    public partial class AddUrgencyToBill : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "StockQuantity",
                table: "ServiceCategories",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BillItemId",
                table: "Disputes",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Urgency",
                table: "Bills",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "IsDisputed",
                table: "BillItems",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_Disputes_BillItemId",
                table: "Disputes",
                column: "BillItemId");

            migrationBuilder.AddForeignKey(
                name: "FK_Disputes_BillItems_BillItemId",
                table: "Disputes",
                column: "BillItemId",
                principalTable: "BillItems",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Disputes_BillItems_BillItemId",
                table: "Disputes");

            migrationBuilder.DropIndex(
                name: "IX_Disputes_BillItemId",
                table: "Disputes");

            migrationBuilder.DropColumn(
                name: "StockQuantity",
                table: "ServiceCategories");

            migrationBuilder.DropColumn(
                name: "BillItemId",
                table: "Disputes");

            migrationBuilder.DropColumn(
                name: "Urgency",
                table: "Bills");

            migrationBuilder.DropColumn(
                name: "IsDisputed",
                table: "BillItems");
        }
    }
}
