import { Construct } from 'constructs';
import { Instance, InstanceType, MachineImage, Peer, Port, SecurityGroup, SelectedSubnets, UserData, Vpc } from 'aws-cdk-lib/aws-ec2';
import { ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';

interface ComputingProps {
  vpc: Vpc;
  selectSubnets: SelectedSubnets;
  readPasswordPolicy: PolicyStatement;
  redisClusterSecurityGroupId: string;
}

export class ComputingConstruct extends Construct {
  readonly instanceId : string;

  constructor(scope: Construct, id: string, props: ComputingProps){
    super(scope, id);

    const role = new Role(this, 'InstanceRole', {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
    });
    role.addToPolicy(props.readPasswordPolicy);
    role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName(
      'AmazonSSMManagedInstanceCore',
    ));
    
    const securityGroup = new SecurityGroup(this, 'SecurityGroup', {
      vpc: props.vpc,
      allowAllOutbound: true,
    });
    securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(22), 'allow SSH access from anywhere');

    const redisSG = SecurityGroup.fromSecurityGroupId(this, 'RedisSG', props.redisClusterSecurityGroupId);
    redisSG.addIngressRule(Peer.securityGroupId(securityGroup.securityGroupId), Port.allTraffic());

    // ./docs/1_golden_image_memo.md を参考にAMIを手動で us-west-2 リージョンに作成してAMIの値を置き換えてください。
    const amiMap = {
      'us-west-2': 'ami-0994d90c75d269a9f',
    };

    const userData = UserData.forLinux();
    userData.addCommands(
      'git clone https://github.com/TowaYamashita/migrate-file-to-redis.git /home/ssm-user/exp',
    );

    // EC2インスタンスの作成
    const instance = new Instance(this, 'Instance', {
      vpc: props.vpc,
      vpcSubnets: props.selectSubnets,
      instanceType: new InstanceType('t3.micro'),
      machineImage: MachineImage.genericLinux(amiMap),
      userData: userData,
      role: role,
      securityGroup: securityGroup,
      keyName: 'sandbox-us-east',
    });

    this.instanceId = instance.instanceId;
  }
}