import { Stack, StackProps } from 'aws-cdk-lib';
import { CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { SessionStorageStack } from './session-storage-stack';
import { ComputingStack } from './computing-stack';

export class MigrateFileToRedisStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new Vpc(this, 'VPC', {
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'redis',
          subnetType: SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'instance',
          subnetType: SubnetType.PUBLIC,
        }
      ],
    });

    const sessionStorage = new SessionStorageStack(this, 'SessionStorage', {
      vpc: vpc,
      selectSubnets: vpc.selectSubnets({ subnetGroupName: 'redis' }),
    });

    const instance = new ComputingStack(this, 'Computing', {
      vpc: vpc,
      selectSubnets: vpc.selectSubnets({ subnetGroupName: 'instance' }),
      readPasswordPolicy: sessionStorage.readPasswordPolicy,
      redisClusterSecurityGroupId: sessionStorage.redisClusterSecurityGroupId,
    });

    new CfnOutput(this, 'RedisClusterEndpoint', {
      value: sessionStorage.endpoint,
    });

    new CfnOutput(this, 'SecretManagerPasswordName', {
      value: sessionStorage.secretName,
    });

    const instanceId = instance.instanceId;
    new CfnOutput(this, 'InstanceDashboardUrl', {
      value: `https://us-west-2.console.aws.amazon.com/ec2/home?region=us-west-2#InstanceDetails:instanceId=${instanceId}`,
    });
  }
}
