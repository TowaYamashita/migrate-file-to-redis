import * as cdk from 'aws-cdk-lib';
import { CfnOutput } from 'aws-cdk-lib';
import { Instance, InstanceType, MachineImage, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class MigrateFileToRedisStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new Vpc(this, 'VPC', {
      maxAzs: 1,
    });

    // ./docs/1_golden_image_memo.md を参考にAMIを手動で us-west-2 リージョンに作成してAMIの値を置き換えてください。
    const amiMap = {
      'us-west-2': 'ami-0d8be177f2821eba9',
    };

    // EC2インスタンスの作成
    const instance = new Instance(this, 'Instance', {
      vpc,
      instanceType: new InstanceType('t3.micro'),
      machineImage: MachineImage.genericLinux(amiMap),
      ssmSessionPermissions: true,
    });

    const instanceId = instance.instanceId;
    new CfnOutput(this, 'InstanceDashboardUrl', {
      value: `https://us-west-2.console.aws.amazon.com/ec2/home?region=us-west-2#InstanceDetails:instanceId=${instanceId}`,
    });
  }
}
