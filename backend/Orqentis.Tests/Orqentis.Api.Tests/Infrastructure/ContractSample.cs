namespace Orqentis.Tests.Orqentis.Api.Tests.Infrastructure;

internal static class ContractSample
{
    public static string CreateYaml(
        string version,
        string? name = null,
        string? targetTablePath = null)
    {
        var contractName = name ?? "Patient Encounters Contract";
        var path = targetTablePath ??
            "abfss://clinical@onelake.dfs.fabric.microsoft.com/ClinicalLakehouse.Lakehouse/Tables/patient_encounters";

        return $$"""
        apiVersion: v3.1.0
        kind: DataContract
        id: urn:orqentis:orqentis:test:patient-encounters
        name: {{contractName}}
        version: {{version}}
        status: draft
        description:
          purpose: Test contract
          usage: Integration testing
        servers:
          - server: fabric-test
            type: azure
            location: {{path}}
            format: delta
        schema:
          - name: patient_encounters
            physicalType: table
            description: Integration test schema
            properties:
              - name: encounter_id
                logicalType: string
                physicalType: STRING
                required: true
                unique: true
                description: Encounter identifier
                customProperties:
                  - property: pii
                    value: false
              - name: encounter_date
                logicalType: date
                physicalType: DATE
                required: true
                partitionKeyPosition: 1
                description: Encounter date
                customProperties:
                  - property: pii
                    value: false
        customProperties:
          - property: orqentisInfo
            value:
              title: {{contractName}}
              description: Integration test contract
              owner: owner@example.com
              contact:
                - name: Data Platform Team
                  email: dataplatform@example.com
                  role: producer
          - property: orqentisFreshness
            value:
              maxAgeHours: 24
              severity: warning
        """;
    }
}
