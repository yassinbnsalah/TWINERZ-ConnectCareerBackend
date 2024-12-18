
const Entreprise = require('../models/entreprise');
const Job = require('../models/job');
const Stats = require('../models/stats');
const User = require('../models/user');

async function getListeEntreprise() {
  try {
    const recruiters = await User.find({ role: 'Recruiter' }).populate(
      'entreprise',
    );

  } catch (error) {
    console.error(error);
    throw new Error('Internal Server Error');
  }
}
async function getAllEntreprise() {
  try {
    return await Entreprise.find();
   
  } catch (error) {
    console.error(error);
    throw new Error('Internal Server Error');
  }
}
async function getEntrepriseDetails(entrepriseId) {
  try {
    // Find the entreprise by its ID
    const entreprise = await Entreprise.findById(entrepriseId).populate("stats");

    if (!entreprise) {
      return res.status(404).json({ message: 'Entreprise not found' });
    }

    const ownerEntreprise = await User.findOne({ entreprise: entrepriseId });
    let jobs;
    if (!ownerEntreprise) {
      jobs = await Job.find({ Relatedentreprise: entrepriseId });
    } else {
      jobs = await Job.find({ recruiter: ownerEntreprise._id });
    }

    return { entreprise, ownerEntreprise, jobs };
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
}

async function getEntrepriseTech() {
  try {
    // Find the entreprise by its ID
    const entreprise = await Entreprise.findOne({ OwnedbyAdmin: true });

    if (!entreprise) {
      let statss = new Stats({

      })
      await statss.save()
     const entrepriseNew = new Entreprise({
      CompanyName: "EspritTech",
      CompanyAdress: "EspritTech",
      CompanyCity: "EspritTech", 
      matriculeFiscale: "EspritTech",
      description:  "EspritTech",
      CompanyType:  "EspritTech",
      CompanyEmail:  "EspritTech",
      CompanyWebsite:  "EspritTech",
      OwnedbyAdmin: true,
      stats : statss
     })
     await entrepriseNew.save()
     return entrepriseNew;
    }

    return entreprise;
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
}

async function UpdateEntreprise(req, res, admin) {
  
  try {
    const entreprise = await Entreprise.findById(req.params.CompanyID);
    console.log(`updating ${entreprise.CompanyName}`);
    if (req.files.CompanyLogo) {
      console.log('Company Logo Updated');
      const CompanyLogoFile = req.files.CompanyLogo[0];
      const CompanyLogoBucket = admin.storage().bucket();
      const CompanyLogoFileObject = CompanyLogoBucket.file(
        CompanyLogoFile.originalname,
      );
      await CompanyLogoFileObject.createWriteStream().end(
        CompanyLogoFile.buffer,
      );
      CompanyLogo = `https://firebasestorage.googleapis.com/v0/b/${CompanyLogoBucket.name}/o/${CompanyLogoFileObject.name}`;
      entreprise.CompanyLogo = CompanyLogo;
      await entreprise.save();
    }
    console.log('Company Logo Updated SS');
    const updateEntreprise = await Entreprise.findByIdAndUpdate(
      req.params.CompanyID,
      { $set: req.body },
      { new: true },
    );
  
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
}

async function CreateEntreprise(req, res, admin) {
  const {
    CompanyName, CompanyAdress, CompanyType, description, CompanyCity,
  } = req.body;
  try {
    if (req.files.CompanyLogo) {
      const CompanyLogoFile = req.files.CompanyLogo[0];
      const CompanyLogoBucket = admin.storage().bucket();
      const CompanyLogoFileObject = CompanyLogoBucket.file(
        CompanyLogoFile.originalname,
      );
      await CompanyLogoFileObject.createWriteStream().end(
        CompanyLogoFile.buffer,
      );
      CompanyLogo = `https://firebasestorage.googleapis.com/v0/b/${CompanyLogoBucket.name}/o/${CompanyLogoFileObject.name}`;
    }
    const entreprise = new Entreprise({
      CompanyName,
      CompanyAdress,
      CompanyType,
      description,
      CompanyLogo,
      CompanyCity,
    });

    await entreprise.save();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
}

module.exports = {
  getListeEntreprise,
  getEntrepriseTech,
  getEntrepriseDetails,
  getAllEntreprise,
  UpdateEntreprise,
  CreateEntreprise,
};
